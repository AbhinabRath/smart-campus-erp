// =============================================================================
// Analytics Controller - Data Analytics Endpoints
// =============================================================================
// Provides aggregated data for analytics dashboards. These endpoints compute
// statistics from the database to help administrators and teachers understand
// attendance trends, marks distributions, and student progress.
//
// All analytics endpoints support date range filtering to enable temporal
// analysis (e.g., "How did attendance change this month vs. last month?").
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * GET /api/analytics/attendance
 * Attendance analytics aggregated by department, subject, or date range.
 * Returns overall attendance rate and per-subject breakdowns.
 */
export async function getAttendanceAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { departmentId, subjectId, from, to } = req.query;

    // Build filter for attendance sessions
    const sessionWhere: any = {};
    if (departmentId) sessionWhere.departmentId = String(departmentId);
    if (subjectId) sessionWhere.subjectId = String(subjectId);
    if (from || to) {
      sessionWhere.startedAt = {};
      if (from) sessionWhere.startedAt.gte = new Date(String(from));
      if (to) sessionWhere.startedAt.lte = new Date(String(to));
    }

    // Get all matching sessions
    const sessions = await prisma.attendanceSession.findMany({
      where: sessionWhere,
      include: {
        _count: { select: { records: true } },
        subject: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
      },
    });

    // Aggregate: total sessions, total attendance records, per-subject breakdown
    const totalSessions = sessions.length;
    const totalRecords = sessions.reduce((sum, s) => sum + s._count.records, 0);
    const avgAttendancePerSession = totalSessions > 0 ? totalRecords / totalSessions : 0;

    // Group by subject for per-subject analytics
    const subjectMap = new Map<string, { name: string; code: string; sessions: number; totalRecords: number }>();
    for (const s of sessions) {
      const existing = subjectMap.get(s.subjectId) || { name: s.subject.name, code: s.subject.code, sessions: 0, totalRecords: 0 };
      existing.sessions += 1;
      existing.totalRecords += s._count.records;
      subjectMap.set(s.subjectId, existing);
    }

    const bySubject = Array.from(subjectMap.entries()).map(([id, data]) => ({
      subjectId: id,
      ...data,
      avgAttendance: data.sessions > 0 ? Math.round((data.totalRecords / data.sessions) * 100) / 100 : 0,
    }));

    successResponse(res, 'Attendance analytics computed.', {
      totalSessions,
      totalRecords,
      avgAttendancePerSession: Math.round(avgAttendancePerSession * 100) / 100,
      bySubject,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/marks
 * Marks analytics: averages, distributions, pass/fail rates.
 */
export async function getMarksAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, examType, departmentId } = req.query;

    const where: any = {};
    if (subjectId) where.subjectId = String(subjectId);
    if (examType) where.examType = String(examType);

    // Filter by department through student relation
    if (departmentId) {
      where.student = { departmentId: String(departmentId) };
    }

    const marks = await prisma.mark.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
      },
    });

    if (marks.length === 0) {
      successResponse(res, 'No marks data available.', { average: 0, distribution: [], passRate: 0 });
      return;
    }

    // Calculate statistics
    const percentages = marks.map(m => (m.marksObtained / m.totalMarks) * 100);
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const passRate = (percentages.filter(p => p >= 40).length / percentages.length) * 100;

    // Distribution: bucket marks into ranges (0-20, 20-40, 40-60, 60-80, 80-100)
    const ranges = [
      { label: '0-20%', min: 0, max: 20 },
      { label: '20-40%', min: 20, max: 40 },
      { label: '40-60%', min: 40, max: 60 },
      { label: '60-80%', min: 60, max: 80 },
      { label: '80-100%', min: 80, max: 100 },
    ];

    const distribution = ranges.map(range => ({
      label: range.label,
      count: percentages.filter(p => p >= range.min && p < range.max).length,
    }));
    // Include 100% in the last bucket
    distribution[distribution.length - 1].count += percentages.filter(p => p === 100).length;

    successResponse(res, 'Marks analytics computed.', {
      totalEntries: marks.length,
      average: Math.round(average * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      distribution,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/assignments
 * Assignment completion rates across subjects and classes.
 */
export async function getAssignmentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId } = req.query;

    const where: any = {};
    if (subjectId) where.subjectId = String(subjectId);

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        _count: { select: { submissions: true } },
        subject: { select: { name: true, code: true, departmentId: true, semester: true } },
      },
    });

    // Get total students for computing completion rate
    const analytics = await Promise.all(
      assignments.map(async (a) => {
        // Count students in the subject's target semester/department
        const studentCount = await prisma.student.count({
          where: {
            departmentId: a.subject.departmentId,
            semester: a.subject.semester,
          },
        });

        const completionRate = studentCount > 0
          ? (a._count.submissions / studentCount) * 100
          : 0;

        return {
          assignmentId: a.id,
          title: a.title,
          subject: a.subject.name,
          totalStudents: studentCount,
          submissions: a._count.submissions,
          completionRate: Math.round(completionRate * 100) / 100,
        };
      })
    );

    const overallCompletionRate = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + a.completionRate, 0) / analytics.length
      : 0;

    successResponse(res, 'Assignment analytics computed.', {
      totalAssignments: assignments.length,
      overallCompletionRate: Math.round(overallCompletionRate * 100) / 100,
      assignments: analytics,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/students/:id/progress
 * Student progress over time — tracks attendance and marks trends.
 */
export async function getStudentProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = id;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    // Attendance progress: count records per month
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: {
        session: { select: { startedAt: true, subject: { select: { name: true } } } },
      },
      orderBy: { markedAt: 'asc' },
    });

    // Marks progress: all marks entries
    const marks = await prisma.mark.findMany({
      where: { studentId: student.id },
      include: {
        subject: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate overall attendance percentage
    const totalSessions = await prisma.attendanceSession.count({
      where: {
        departmentId: student.departmentId,
        semester: student.semester,
        section: student.section,
      },
    });

    const attendancePercentage = totalSessions > 0
      ? (attendanceRecords.length / totalSessions) * 100
      : 0;

    // Calculate marks summary
    const marksSummary = marks.reduce(
      (acc, m) => {
        const pct = (m.marksObtained / m.totalMarks) * 100;
        acc.totalMarksObtained += m.marksObtained;
        acc.totalMaxMarks += m.totalMarks;
        acc.byExamType[m.examType] = acc.byExamType[m.examType] || { total: 0, count: 0, obtained: 0 };
        acc.byExamType[m.examType].total += m.totalMarks;
        acc.byExamType[m.examType].obtained += m.marksObtained;
        acc.byExamType[m.examType].count += 1;
        return acc;
      },
      { totalMarksObtained: 0, totalMaxMarks: 0, byExamType: {} as Record<string, { total: number; count: number; obtained: number }> }
    );

    successResponse(res, 'Student progress computed.', {
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        semester: student.semester,
        section: student.section,
      },
      attendance: {
        totalSessions,
        attended: attendanceRecords.length,
        percentage: Math.round(attendancePercentage * 100) / 100,
        records: attendanceRecords,
      },
      marks: {
        overallPercentage: marksSummary.totalMaxMarks > 0
          ? Math.round((marksSummary.totalMarksObtained / marksSummary.totalMaxMarks) * 10000) / 100
          : 0,
        byExamType: Object.fromEntries(
          Object.entries(marksSummary.byExamType).map(([type, data]) => [
            type,
            {
              ...data,
              averagePercentage: data.total > 0 ? Math.round((data.obtained / data.total) * 10000) / 100 : 0,
            },
          ])
        ),
        records: marks,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/department/:id
 * Department-level analytics: student count, teacher count, attendance/marks overview.
 */
export async function getDepartmentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true, teachers: true, subjects: true } },
      },
    });

    if (!department) {
      errorResponse(res, 'Department not found.', 404);
      return;
    }

    // Attendance stats for this department
    const attendanceSessions = await prisma.attendanceSession.findMany({
      where: { departmentId: id },
      include: { _count: { select: { records: true } } },
    });

    const totalAttendanceRecords = attendanceSessions.reduce((sum, s) => sum + s._count.records, 0);

    // Marks stats for this department
    const marks = await prisma.mark.findMany({
      where: { student: { departmentId: id } },
    });

    const avgMarks = marks.length > 0
      ? marks.reduce((sum, m) => sum + (m.marksObtained / m.totalMarks) * 100, 0) / marks.length
      : 0;

    successResponse(res, 'Department analytics computed.', {
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
      },
      counts: {
        students: department._count.students,
        teachers: department._count.teachers,
        subjects: department._count.subjects,
      },
      attendance: {
        totalSessions: attendanceSessions.length,
        totalRecords: totalAttendanceRecords,
      },
      marks: {
        totalEntries: marks.length,
        averagePercentage: Math.round(avgMarks * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
}

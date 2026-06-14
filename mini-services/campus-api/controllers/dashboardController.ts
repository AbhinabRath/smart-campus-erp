// =============================================================================
// Dashboard Controller - Aggregated Dashboard Data
// =============================================================================
// Provides role-specific dashboard data in a single API call.
// Instead of the frontend making 5-6 separate requests to assemble a dashboard,
// these endpoints aggregate all needed data in one response.
//
// This reduces:
//   - Network round trips (1 request instead of 6)
//   - Loading time (parallel DB queries on the server)
//   - Frontend complexity (no need to merge multiple responses)
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * GET /api/dashboard/student
 * Student dashboard: attendance %, recent attendance, marks overview,
 * upcoming assignments, notices, today's timetable, recent materials, recommendations.
 */
export async function getStudentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: { department: { select: { name: true, code: true } } },
    });

    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    // Run all queries in parallel for performance
   const [
  totalSessions,
  attendedCount,
  recentAttendance,
  marks,
  assignments,
  notices,
  todayTimetable,
  recentMaterials,
  recommendations,
] = await Promise.all([
      // Total attendance sessions for this student's class
      prisma.attendanceSession.count({
        where: {
          departmentId: student.departmentId,
          semester: student.semester,
          section: student.section,
        },
      }),

      // Sessions this student attended
      prisma.attendanceRecord.count({
        where: { studentId: student.id },
      }),

      // Recent 5 attendance records
      prisma.attendanceRecord.findMany({
        where: { studentId: student.id },
        include: {
          session: {
            include: { subject: { select: { name: true, code: true } } },
          },
        },
        orderBy: { markedAt: 'desc' },
        take: 5,
      }),

      // All marks for summary
      prisma.mark.findMany({
        where: { studentId: student.id },
        include: { subject: { select: { name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
      }),

      // Upcoming assignments (deadline in the future)
      prisma.assignment.findMany({
        where: {
          subject: {
            departmentId: student.departmentId,
            semester: student.semester,
          },
          deadline: { gte: new Date() },
        },
        include: {
          subject: { select: { name: true, code: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),

      // Latest notices for students
      prisma.notice.findMany({
        where: {
          OR: [{ targetRole: 'all' }, { targetRole: 'student' }],
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Today's timetable
      prisma.timetable.findMany({
        where: {
          departmentId: student.departmentId,
          semester: student.semester,
          section: student.section,
          dayOfWeek: new Date().getDay() || 7, // Convert Sunday=0 to Monday-based
        },
        include: {
          subject: { select: { name: true, code: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
        orderBy: { periodNumber: 'asc' },
      }),

      // Recent study materials for student's subjects
      prisma.studyMaterial.findMany({
        where: {
          subject: {
            departmentId: student.departmentId,
            semester: student.semester,
          },
        },
        include: {
          subject: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Unread recommendations
      prisma.recommendation.findMany({
        where: { studentId: userId, isRead: false },
        orderBy: { priority: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate attendance percentage
    const attendancePercentage = totalSessions > 0
      ? Math.round((attendedCount / totalSessions) * 10000) / 100
      : 0;

    // Calculate marks overview
    const totalMarksObtained = marks.reduce((sum, m) => sum + m.marksObtained, 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.totalMarks, 0);
    const marksPercentage = totalMaxMarks > 0
      ? Math.round((totalMarksObtained / totalMaxMarks) * 10000) / 100
      : 0;

    successResponse(res, 'Student dashboard data loaded.', {
      student: {
        name: req.user!.name,
        rollNumber: student.rollNumber,
        semester: student.semester,
        section: student.section,
        department: student.department,
      },
      attendance: {
        percentage: attendancePercentage,
        totalSessions,
        attended: attendedCount,
        recentRecords: recentAttendance,
      },
      marks: {
        percentage: marksPercentage,
        totalSubjects: marks.length,
        recentMarks: marks.slice(0, 5),
      },
      assignments,
      notices,
      timetable: todayTimetable,
      materials: recentMaterials,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/teacher
 * Teacher dashboard: active sessions, assignments, materials, marks stats, notices.
 */
export async function getTeacherDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { department: { select: { name: true, code: true } } },
    });

    if (!teacher) {
      errorResponse(res, 'Teacher profile not found.', 404);
      return;
    }

    const [
      activeSessions,
      recentAssignments,
      recentMaterials,
      marksCount,
      recentNotices,
      totalStudents,
    ] = await Promise.all([
      // Active attendance sessions
      prisma.attendanceSession.findMany({
        where: { teacherId: teacher.id, isActive: true },
        include: {
          subject: { select: { name: true, code: true } },
          _count: { select: { records: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),

      // Recent assignments created by this teacher
      prisma.assignment.findMany({
        where: { teacherId: teacher.id },
        include: {
          subject: { select: { name: true, code: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent materials uploaded
      prisma.studyMaterial.findMany({
        where: { teacherId: teacher.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Total marks entries by this teacher
      prisma.mark.count({ where: { teacherId: teacher.id } }),

      // Latest notices for teachers
      prisma.notice.findMany({
        where: { OR: [{ targetRole: 'all' }, { targetRole: 'teacher' }] },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Count of students in teacher's department
      prisma.student.count({
        where: { departmentId: teacher.departmentId },
      }),
    ]);

    successResponse(res, 'Teacher dashboard data loaded.', {
      teacher: {
        name: req.user!.name,
        employeeId: teacher.employeeId,
        designation: teacher.designation,
        department: teacher.department,
      },
      activeSessions,
      assignments: recentAssignments,
      materials: recentMaterials,
      marksCount,
      notices: recentNotices,
      totalStudents,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/admin
 * Admin dashboard: user counts, department stats, recent activity, analytics summary.
 */
export async function getAdminDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
   const [
  totalStudents,
  totalTeachers,
  totalAdmins,
  departments,
  recentSessions,
  recentNotices,
  pendingLeaves,
  totalSubjects,
  attendanceSessions,
  attendanceRecords,
] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.department.findMany({
        include: {
          _count: { select: { students: true, teachers: true, subjects: true } },
        },
      }),
      // Recent attendance sessions
      prisma.attendanceSession.findMany({
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          subject: { select: { name: true } },
          _count: { select: { records: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.attendanceRecord.findMany({
        include: {
          session: {
            select: {
              startedAt: true,
            },
          },
        },
      }),
      // Recent notices
      prisma.notice.findMany({
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Pending leave requests
      prisma.leaveRequest.count({ where: { status: 'pending' } }),
      prisma.subject.count(),
      prisma.attendanceSession.findMany({
  include: {
    _count: {
      select: {
        records: true,
      },
    },
  },
  orderBy: {
    startedAt: 'asc',
  },
}),
    ]);

    successResponse(res, 'Admin dashboard data loaded.', {
      userStats: {
        totalStudents,
        totalTeachers,
        totalAdmins,
        totalUsers: totalStudents + totalTeachers + totalAdmins,
      },
      departments,
      totalSubjects,
      attendanceSessions,
      recentActivity: {
        attendanceSessions: recentSessions,
        notices: recentNotices,
      },
      pendingLeaves,
    });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// Marks Controller - Student Marks/Grades Management
// =============================================================================
// Handles CRUD operations for student marks across different exam types
// (internal1, internal2, assignment, lab, semester).
// Teachers can create/edit/delete marks; students can view their own marks.
//
// Key design decisions:
//   - Unique constraint on (studentId, subjectId, teacherId, examType) prevents
//     duplicate marks entries for the same student/subject/exam combination.
//   - Students can only view their own marks (no peeking at others' grades).
//   - Teachers can only enter marks for subjects they teach (enforced by role).
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * POST /api/marks
 * Teacher uploads marks for a student in a specific subject and exam type.
 */
export async function createMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, subjectId, examType, marksObtained, totalMarks, remarks } = req.body;
    const userId = req.user!.id;

    // Find the teacher profile for the current user
    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      errorResponse(res, 'Teacher profile not found.', 404);
      return;
    }

    // Create marks entry. The unique constraint (studentId, subjectId, teacherId, examType)
    // in the schema will prevent duplicates and throw a P2002 error if violated.
    const mark = await prisma.mark.create({
      data: {
        studentId,
        subjectId,
        teacherId: teacher.id,
        examType,
        marksObtained: parseFloat(String(marksObtained)),
        totalMarks: parseFloat(String(totalMarks)),
        remarks: remarks || null,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        subject: { select: { name: true, code: true } },
      },
    });

    successResponse(res, 'Marks created successfully.', mark, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/marks/:id
 * Teacher updates existing marks entry.
 */
export async function updateMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { marksObtained, totalMarks, remarks } = req.body;

    const existing = await prisma.mark.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Marks entry not found.', 404);
      return;
    }

    const mark = await prisma.mark.update({
      where: { id },
      data: {
        marksObtained: marksObtained !== undefined ? parseFloat(String(marksObtained)) : undefined,
        totalMarks: totalMarks !== undefined ? parseFloat(String(totalMarks)) : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        subject: { select: { name: true, code: true } },
      },
    });

    successResponse(res, 'Marks updated successfully.', mark);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/marks/:id
 * Teacher deletes a marks entry.
 */
export async function deleteMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.mark.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Marks entry not found.', 404);
      return;
    }

    await prisma.mark.delete({ where: { id } });
    successResponse(res, 'Marks deleted successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/marks/student/:studentId
 * Get all marks for a specific student. Accessible by teachers and admins.
 */
export async function getMarksByStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const { examType } = req.query;

    const where: any = { studentId };
    if (examType) where.examType = String(examType);

    const marks = await prisma.mark.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true, semester: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Student marks retrieved.', marks);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/marks/subject/:subjectId
 * Get all marks for a specific subject. Useful for teachers to see
 * the class performance in their subject.
 */
export async function getMarksBySubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId } = req.params;
    const { examType } = req.query;

    const where: any = { subjectId };
    if (examType) where.examType = String(examType);

    const marks = await prisma.mark.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Subject marks retrieved.', marks);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/marks/my-marks
 * Student views their own marks. Ensures students can only see their data.
 */
export async function getMyMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { examType, subjectId } = req.query;

    // Find student profile for the current user
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    const where: any = { studentId: student.id };
    if (examType) where.examType = String(examType);
    if (subjectId) where.subjectId = String(subjectId);

    const marks = await prisma.mark.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true, semester: true, credits: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary statistics for the student
    const totalMarksObtained = marks.reduce((sum, m) => sum + m.marksObtained, 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.totalMarks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

    successResponse(res, 'Your marks retrieved.', {
      marks,
      summary: {
        totalMarksObtained,
        totalMaxMarks,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
}

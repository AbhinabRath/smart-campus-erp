// =============================================================================
// Subject Controller - Subject Management (Admin)
// =============================================================================
// CRUD operations for academic subjects. Subjects link departments to
// attendance sessions, marks, assignments, study materials, and timetables.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * GET /api/subjects
 * List subjects with optional filters (department, semester, type).
 */
export async function getSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { departmentId, semester, type } = req.query;

    const where: any = {};
    if (departmentId) where.departmentId = String(departmentId);
    if (semester) where.semester = parseInt(String(semester));
    if (type) where.type = String(type);

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        department: { select: { name: true, code: true } },
        _count: {
          select: {
            attendanceSessions: true,
            marks: true,
            assignments: true,
            studyMaterials: true,
          },
        },
      },
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
    });

    successResponse(res, 'Subjects retrieved.', subjects);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/subjects
 * Create a new subject.
 */
export async function createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code, departmentId, semester, credits, type } = req.body;

    const subject = await prisma.subject.create({
      data: {
        name,
        code: code.toUpperCase(),
        departmentId,
        semester: parseInt(String(semester)),
        credits: credits ? parseInt(String(credits)) : 3,
        type: type || 'theory',
      },
      include: {
        department: { select: { name: true, code: true } },
      },
    });

    successResponse(res, 'Subject created successfully.', subject, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/subjects/:id
 * Update a subject.
 */
export async function updateSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, code, departmentId, semester, credits, type } = req.body;

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Subject not found.', 404);
      return;
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: name || undefined,
        code: code ? code.toUpperCase() : undefined,
        departmentId: departmentId || undefined,
        semester: semester ? parseInt(String(semester)) : undefined,
        credits: credits ? parseInt(String(credits)) : undefined,
        type: type || undefined,
      },
      include: {
        department: { select: { name: true, code: true } },
      },
    });

    successResponse(res, 'Subject updated.', subject);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/subjects/:id
 * Delete a subject. Will fail if there are associated records.
 */
export async function deleteSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendanceSessions: true,
            marks: true,
            assignments: true,
            studyMaterials: true,
            timetables: true,
          },
        },
      },
    });

    if (!existing) {
      errorResponse(res, 'Subject not found.', 404);
      return;
    }

    const hasAssociations = Object.values(existing._count).some(count => count > 0);
    if (hasAssociations) {
      errorResponse(res, 'Cannot delete subject with associated records.', 400);
      return;
    }

    await prisma.subject.delete({ where: { id } });
    successResponse(res, 'Subject deleted.');
  } catch (err) {
    next(err);
  }
}

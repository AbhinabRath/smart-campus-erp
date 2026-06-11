// =============================================================================
// Timetable Controller - Weekly Schedule Management
// =============================================================================
// Handles CRUD operations for timetable entries. Timetable entries define
// which subject is taught by which teacher in which room at which time slot.
//
// The unique constraint (departmentId, semester, section, dayOfWeek, periodNumber)
// prevents double-booking of time slots — two subjects can't occupy the same
// period for the same class section.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * POST /api/timetables
 * Admin creates a single timetable entry.
 */
export async function createTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      departmentId, semester, section, dayOfWeek, periodNumber,
      subjectId, teacherId, roomNumber, startTime, endTime,
    } = req.body;

    const timetable = await prisma.timetable.create({
      data: {
        departmentId,
        semester,
        section: section || 'A',
        dayOfWeek: parseInt(String(dayOfWeek)),
        periodNumber: parseInt(String(periodNumber)),
        subjectId,
        teacherId,
        roomNumber,
        startTime,
        endTime,
      },
      include: {
        department: { select: { name: true, code: true } },
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    successResponse(res, 'Timetable entry created.', timetable, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/timetables/bulk
 * Admin creates multiple timetable entries at once. Useful when setting up
 * the weekly schedule for a class — one request instead of 40+ individual ones.
 */
export async function createBulkTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      errorResponse(res, 'Entries array is required.', 400);
      return;
    }

    const timetables = await prisma.timetable.createMany({
      data: entries.map((entry: any) => ({
        departmentId: entry.departmentId,
        semester: parseInt(String(entry.semester)),
        section: entry.section || 'A',
        dayOfWeek: parseInt(String(entry.dayOfWeek)),
        periodNumber: parseInt(String(entry.periodNumber)),
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        roomNumber: entry.roomNumber,
        startTime: entry.startTime,
        endTime: entry.endTime,
      })),
    });

    successResponse(res, `${timetables.count} timetable entries created.`, { count: timetables.count }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/timetables/:id
 * Admin updates a timetable entry.
 */
export async function updateTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { subjectId, teacherId, roomNumber, startTime, endTime } = req.body;

    const existing = await prisma.timetable.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Timetable entry not found.', 404);
      return;
    }

    const timetable = await prisma.timetable.update({
      where: { id },
      data: {
        subjectId: subjectId || undefined,
        teacherId: teacherId || undefined,
        roomNumber: roomNumber || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      },
      include: {
        department: { select: { name: true, code: true } },
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    successResponse(res, 'Timetable entry updated.', timetable);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/timetables/:id
 * Admin deletes a timetable entry.
 */
export async function deleteTimetable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.timetable.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Timetable entry not found.', 404);
      return;
    }

    await prisma.timetable.delete({ where: { id } });
    successResponse(res, 'Timetable entry deleted.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/timetables
 * View timetable entries with filters (department, semester, teacher).
 * Returns entries organized by day for easy display in a weekly grid.
 */
export async function getTimetables(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { departmentId, semester, section, teacherId } = req.query;

    const where: any = {};
    if (departmentId) where.departmentId = String(departmentId);
    if (semester) where.semester = parseInt(String(semester));
    if (section) where.section = String(section);
    if (teacherId) where.teacherId = String(teacherId);

    const timetables = await prisma.timetable.findMany({
      where,
      include: {
        department: { select: { name: true, code: true } },
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });

    // Organize by day of week for frontend weekly grid display
    const byDay: Record<number, typeof timetables> = {};
    for (const entry of timetables) {
      if (!byDay[entry.dayOfWeek]) byDay[entry.dayOfWeek] = [];
      byDay[entry.dayOfWeek].push(entry);
    }

    successResponse(res, 'Timetables retrieved.', { timetables, byDay });
  } catch (err) {
    next(err);
  }
}

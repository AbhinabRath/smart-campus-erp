// =============================================================================
// Department Controller - Department Management (Admin)
// =============================================================================
// CRUD operations for academic departments. Departments are the top-level
// organizational unit — students, teachers, and subjects all belong to one.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * GET /api/departments
 * List all departments with associated counts.
 */
export async function getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: { students: true, teachers: true, subjects: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    successResponse(res, 'Departments retrieved.', departments);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/departments
 * Create a new department.
 */
export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, code } = req.body;

    const department = await prisma.department.create({
      data: { name, code: code.toUpperCase() },
    });

    successResponse(res, 'Department created successfully.', department, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/departments/:id
 * Update a department.
 */
export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Department not found.', 404);
      return;
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name: name || undefined,
        code: code ? code.toUpperCase() : undefined,
      },
    });

    successResponse(res, 'Department updated.', department);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/departments/:id
 * Delete a department. Will fail if there are associated records.
 */
export async function deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { students: true, teachers: true, subjects: true } } },
    });

    if (!existing) {
      errorResponse(res, 'Department not found.', 404);
      return;
    }

    // Prevent deletion if department has associated records
    if (existing._count.students > 0 || existing._count.teachers > 0 || existing._count.subjects > 0) {
      errorResponse(res, 'Cannot delete department with associated students, teachers, or subjects.', 400);
      return;
    }

    await prisma.department.delete({ where: { id } });
    successResponse(res, 'Department deleted.');
  } catch (err) {
    next(err);
  }
}

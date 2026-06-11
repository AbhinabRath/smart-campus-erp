// =============================================================================
// Leave Controller - Leave Request Management
// =============================================================================
// Handles the leave application workflow:
//   1. Student/Teacher submits a leave request with dates and reason
//   2. Request is stored with "pending" status
//   3. Admin can approve or reject with optional comments
//
// This keeps a full audit trail of leave requests, their status, and who
// approved/rejected them — important for attendance and payroll calculations.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * POST /api/leaves
 * Student or Teacher applies for a leave.
 */
export async function createLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = req.user!.id;

    // Validate date range: end date must be on or after start date
    if (new Date(endDate) < new Date(startDate)) {
      errorResponse(res, 'End date must be on or after start date.', 400);
      return;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: 'pending',
      },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });

    successResponse(res, 'Leave request submitted.', leave, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leaves
 * List leave requests with optional filters.
 * Admin sees all; users see only their own (unless admin).
 */
export async function getLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, userId } = req.query;
    const currentUserRole = req.user!.role;
    const currentUserId = req.user!.id;

    const where: any = {};

    // Non-admin users can only see their own leaves
    if (currentUserRole !== 'admin') {
      where.userId = currentUserId;
    } else if (userId) {
      where.userId = String(userId);
    }

    if (status) where.status = String(status);

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, role: true } },
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Leave requests retrieved.', leaves);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/leaves/:id/approve
 * Admin approves a leave request.
 */
export async function approveLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const adminId = req.user!.id;

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      errorResponse(res, 'Leave request not found.', 404);
      return;
    }

    // Can't approve an already-processed request
    if (leave.status !== 'pending') {
      errorResponse(res, `Leave request is already ${leave.status}.`, 400);
      return;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: adminId,
        comments: comments || null,
      },
      include: {
        user: { select: { name: true, email: true } },
        approver: { select: { name: true } },
      },
    });

    successResponse(res, 'Leave request approved.', updated);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/leaves/:id/reject
 * Admin rejects a leave request.
 */
export async function rejectLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const adminId = req.user!.id;

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      errorResponse(res, 'Leave request not found.', 404);
      return;
    }

    if (leave.status !== 'pending') {
      errorResponse(res, `Leave request is already ${leave.status}.`, 400);
      return;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedBy: adminId,
        comments: comments || null,
      },
      include: {
        user: { select: { name: true, email: true } },
        approver: { select: { name: true } },
      },
    });

    successResponse(res, 'Leave request rejected.', updated);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leaves/my-leaves
 * User views their own leave requests regardless of role.
 */
export async function getMyLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    const where: any = { userId };
    if (status) where.status = String(status);

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Your leave requests retrieved.', leaves);
  } catch (err) {
    next(err);
  }
}

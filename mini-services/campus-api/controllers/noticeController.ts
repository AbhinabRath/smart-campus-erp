// =============================================================================
// Notice Controller - Announcement Management
// =============================================================================
// Handles CRUD for campus-wide announcements (notices). Notices can be
// targeted to specific roles (students, teachers, or all) and have priority
// levels (urgent, high, normal, low) for display ordering.
//
// Only admins and teachers can publish notices. This ensures announcements
// come from authoritative sources and not from random users.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * POST /api/notices
 * Admin or Teacher publishes a new notice.
 */
export async function createNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content, targetRole, priority, isPinned } = req.body;
    const userId = req.user!.id;

    const notice = await prisma.notice.create({
      data: {
        authorId: userId,
        title,
        content,
        targetRole: targetRole || 'all',
        priority: priority || 'normal',
        isPinned: isPinned || false,
      },
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    successResponse(res, 'Notice published successfully.', notice, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notices
 * List notices with optional filters. Pinned notices appear first,
 * then sorted by creation date (newest first).
 */
export async function getNotices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { targetRole, priority } = req.query;

    const where: any = {};
    // Filter by target role — students should only see "all" and "student" notices
    if (targetRole) where.targetRole = String(targetRole);
    if (priority) where.priority = String(priority);

    // If user is a student, automatically filter to only show relevant notices
    if (req.user?.role === 'student') {
      where.OR = [
        { targetRole: 'all' },
        { targetRole: 'student' },
      ];
    } else if (req.user?.role === 'teacher') {
      where.OR = [
        { targetRole: 'all' },
        { targetRole: 'teacher' },
      ];
    }

   const notices = await prisma.notice.findMany({
  where,
  include: {
    author: {
      select: {
        name: true,
        role: true,
      },
    },
    reads: {
      where: {
        userId: req.user!.id,
      },
      select: {
        id: true,
      },
    },
  },
  orderBy: [
    { isPinned: 'desc' },
    { createdAt: 'desc' },
  ],
});

const result = notices.map(({ reads, ...notice }) => ({
  ...notice,
  isRead: reads.length > 0,
}));

successResponse(res, 'Notices retrieved.', result);
return;

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notices/:id
 * Get detailed information about a specific notice.
 */
export async function getNoticeById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const notice = await prisma.notice.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, role: true, email: true } },
      },
    });

    if (!notice) {
      errorResponse(res, 'Notice not found.', 404);
      return;
    }

    successResponse(res, 'Notice retrieved.', notice);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/notices/:id
 * Update a notice (author or admin only).
 */
export async function updateNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { title, content, targetRole, priority, isPinned } = req.body;

    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Notice not found.', 404);
      return;
    }

    // Only the author or admin can update a notice
    if (existing.authorId !== req.user!.id && req.user!.role !== 'admin') {
      errorResponse(res, 'You can only edit your own notices.', 403);
      return;
    }

    const notice = await prisma.notice.update({
      where: { id },
      data: {
        title: title || undefined,
        content: content || undefined,
        targetRole: targetRole || undefined,
        priority: priority || undefined,
        isPinned: isPinned !== undefined ? isPinned : undefined,
      },
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    successResponse(res, 'Notice updated.', notice);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notices/:id
 * Delete a notice (author or admin only).
 */
export async function deleteNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Notice not found.', 404);
      return;
    }

    if (existing.authorId !== req.user!.id && req.user!.role !== 'admin') {
      errorResponse(res, 'You can only delete your own notices.', 403);
      return;
    }

    await prisma.notice.delete({ where: { id } });
    successResponse(res, 'Notice deleted.');
  } catch (err) {
    next(err);
  }
}
/**
 * POST /api/notices/:id/read
 * Toggle read/unread status for current user.
 */
export async function toggleNoticeRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: noticeId } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.noticeRead.findUnique({
      where: {
        userId_noticeId: {
          userId,
          noticeId,
        },
      },
    });

    if (existing) {
      await prisma.noticeRead.delete({
        where: {
          userId_noticeId: {
            userId,
            noticeId,
          },
        },
      });

      successResponse(res, 'Notice marked as unread.', { isRead: false });
      return;
    }

    await prisma.noticeRead.create({
      data: {
        userId,
        noticeId,
      },
    });

    successResponse(res, 'Notice marked as read.', { isRead: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/notices/read-all
 * Mark all visible notices as read.
 */
export async function markAllNoticesRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const notices = await prisma.notice.findMany({
      select: { id: true },
    });

    await prisma.noticeRead.createMany({
      data: notices.map((n) => ({
        userId,
        noticeId: n.id,
      })),
      skipDuplicates: true,
    });

    successResponse(res, 'All notices marked as read.');
  } catch (err) {
    next(err);
  }
}

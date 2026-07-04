// =============================================================================
// Recommendation Controller - Recommendation Management Endpoints
// =============================================================================
// Exposes the rule-based recommendation engine to the API.
// Students can view their recommendations, trigger regeneration, and
// mark recommendations as read. The recommendation engine runs rule-based
// checks on the student's attendance, marks, assignments, and career path.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { generateRecommendations } from '../services/recommendationEngine';

/**
 * GET /api/recommendations
 * Get all recommendations for the current student.
 * Returns unread recommendations first, then read ones.
 */
export async function getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const [recommendations, unreadCount] =
  await Promise.all([
    prisma.recommendation.findMany({
      where: {
        studentId: userId,
      },
      orderBy: [
        { isRead: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    }),

    prisma.recommendation.count({
      where: {
        studentId: userId,
        isRead: false,
      },
    }),
  ]);

    successResponse(res, 'Recommendations retrieved.', { recommendations, unreadCount });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/recommendations/generate
 * Trigger recommendation generation for a specific student.
 * Can be called by the student themselves or by an admin.
 */
export async function generateStudentRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.body;
    const targetStudentId = studentId || req.user!.id;

    // Only admin can generate recommendations for other students
    if (studentId && studentId !== req.user!.id && req.user!.role !== 'admin') {
      errorResponse(res, 'You can only generate recommendations for yourself.', 403);
      return;
    }

    const newRecommendations = await generateRecommendations(targetStudentId);

    successResponse(res, `Generated ${newRecommendations.length} new recommendation(s).`, {
      count: newRecommendations.length,
      recommendations: newRecommendations,
    });
  } catch (err) {
    next(err);
  }
}
/**
 * DELETE /api/recommendations/clear
 * Delete all recommendations for current student.
 */
export async function clearRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    await prisma.recommendation.deleteMany({
      where: {
        studentId: userId
      }
    });

    successResponse(
      res,
      'Recommendations cleared.'
    );
  } catch (err) {
    next(err);
  }
}
/**
 * PUT /api/recommendations/:id/read
 * Mark a recommendation as read so it no longer appears as a notification.
 */
export async function markRecommendationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const recommendation = await prisma.recommendation.findUnique({ where: { id } });
    if (!recommendation) {
      errorResponse(res, 'Recommendation not found.', 404);
      return;
    }

    // Students can only mark their own recommendations as read
    if (recommendation.studentId !== userId && req.user!.role !== 'admin') {
      errorResponse(res, 'You can only mark your own recommendations.', 403);
      return;
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: { isRead: true },
    });

    successResponse(res, 'Recommendation marked as read.', updated);
  } catch (err) {
    next(err);
  }
}

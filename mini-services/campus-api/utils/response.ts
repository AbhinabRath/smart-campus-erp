// =============================================================================
// Standardized API Response Helpers
// =============================================================================
// These helpers ensure every API response follows a consistent format.
// This makes it easy for the frontend to handle responses predictably:
//   - success responses always have { success: true, message, data }
//   - error responses always have { success: false, message, errors? }
// Without this, different controllers might return different shapes, causing
// fragile frontend parsing logic and inconsistent UX.
// =============================================================================

import { Response } from 'express';

/**
 * Send a success response with standard format.
 * @param res - Express response object
 * @param message - Human-readable success message
 * @param data - Payload data to return
 * @param statusCode - HTTP status code (default 200)
 */
export function successResponse(
  res: Response,
  message: string,
  data: any = null,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error response with standard format.
 * @param res - Express response object
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (default 500)
 * @param errors - Optional array of detailed validation/error messages
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 500,
  errors: any[] = []
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Send a paginated success response.
 * Wraps data with pagination metadata so the frontend can implement
 * page navigation without additional requests.
 */
export function paginatedResponse(
  res: Response,
  message: string,
  data: any,
  page: number,
  limit: number,
  total: number
): Response {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

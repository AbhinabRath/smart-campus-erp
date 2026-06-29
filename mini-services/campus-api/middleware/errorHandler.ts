// =============================================================================
// Global Error Handling Middleware
// =============================================================================
// Catches all unhandled errors thrown in route handlers or other middleware.
// This ensures the API always returns a consistent JSON error response instead
// of leaking stack traces or returning HTML error pages (Express default).
// Also handles Multer file upload errors specifically, since multer throws
// custom error types that need different HTTP status codes.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

/**
 * Global error handler - must be registered as the last middleware.
 * Express recognizes it as an error handler because it has 4 parameters.
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error("========== FULL ERROR ==========");
console.error(err);
console.error("Message:", err?.message);
console.error("Name:", err?.name);
console.error("Stack:", err?.stack);
console.error("================================");

  // Handle Multer file upload errors
  // Multer throws a custom error class with a code property for known issues
  // like file size limits or unexpected field names.
  if (err.name === 'MulterError') {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        errorResponse(res, 'File size exceeds the 10MB limit.', 413);
        return;
      case 'LIMIT_FILE_COUNT':
        errorResponse(res, 'Too many files uploaded.', 413);
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        errorResponse(res, 'Unexpected file field name.', 400);
        return;
      default:
        errorResponse(res, 'File upload error.', 400);
        return;
    }
  }

  // Handle our custom validation/file-type errors thrown in fileFilter
  if (err.message?.includes('Invalid file type')) {
    errorResponse(res, err.message, 400);
    return;
  }

  // Prisma known errors (e.g., unique constraint violations, record not found)
  if (err.code === 'P2002') {
    // Unique constraint violation - someone tried to create a duplicate record
    const field = err.meta?.target?.[0] || 'field';
    errorResponse(res, `Duplicate value for ${field}. This record already exists.`, 409);
    return;
  }

  if (err.code === 'P2025') {
    // Record not found - tried to update/delete a non-existent record
    errorResponse(res, 'Record not found.', 404);
    return;
  }

  // Default: internal server error for anything we don't specifically handle
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';
  errorResponse(res, message, statusCode);
}

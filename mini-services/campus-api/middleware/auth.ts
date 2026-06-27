// =============================================================================
// Authentication & Authorization Middleware
// =============================================================================
// Provides two middleware functions for protecting routes:
// 1. requireAuth - Verifies the user has a valid session by checking BOTH:
//    a) The campus_session cookie (primary — works for same-site requests)
//    b) The Authorization: Bearer <token> header (fallback — works in
//       cross-site iframes where SameSite=Lax cookies are blocked)
//    Then validates the token against the Session table in the database.
//    Attaches the authenticated user to req.user for downstream handlers.
// 2. requireRole - A factory function that returns middleware to check if the
//    authenticated user's role is in the allowed list. This enables role-based
//    access control (e.g., only teachers can create attendance sessions).
//
// Session flow:
//   - User logs in → session token created in DB → token set as httpOnly cookie
//     AND returned in response body for frontend to store as Bearer token
//   - Subsequent requests → cookie OR Authorization header checked → token
//     looked up in DB
//   - If found and not expired → req.user populated → route handler proceeds
//   - If not found or expired → 401 Unauthorized
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { errorResponse } from '../utils/response';

// Extend Express Request type to include our custom user property.
// This allows controllers to access req.user with proper TypeScript support.
 
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
      sessionToken?: string;
    }
  }
}

/**
 * requireAuth - Ensures the request comes from an authenticated user.
 *
 * Checks TWO sources for the session token (in order of priority):
 * 1. campus_session cookie — works for same-origin requests
 * 2. Authorization: Bearer <token> header — works in cross-site iframes
 *    where SameSite=Lax cookies are blocked by the browser
 *
 * This dual approach ensures auth works both when the app is accessed
 * directly AND when it's embedded in a cross-site iframe (e.g., sandbox
 * preview panel).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Source 1: Extract session token from the cookie set during login
    let sessionToken = req.cookies?.campus_session;

    // Source 2: Fallback to Authorization header (Bearer token)
    // This is critical for cross-site iframe contexts where SameSite=Lax
    // cookies are not sent by the browser on XHR/fetch subrequests.
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      errorResponse(res, 'Authentication required. Please log in.', 401);
      return;
    }

    // Look up the session in the database. We include the user relation
    // so we can attach user info to the request without an extra query.
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    // Session not found means the token is invalid or was revoked
    if (!session) {
      errorResponse(res, 'Invalid session. Please log in again.', 401);
      return;
    }

    // Check if session has expired. Even though the cookie has maxAge,
    // we also track expiry in the DB for server-side control (e.g., admin
    // can invalidate sessions, or cleanup expired sessions).
    if (new Date() > session.expiresAt) {
      // Clean up expired session from DB to prevent stale data buildup
      await prisma.session.delete({ where: { id: session.id } });
      errorResponse(res, 'Session expired. Please log in again.', 401);
      return;
    }

    // Check if user account is still active (admin may have deactivated it)
    if (!session.user.isActive) {
      await prisma.session.delete({ where: { id: session.id } });
      errorResponse(res, 'Account has been deactivated. Contact administrator.', 401);
      return;
    }

    // Attach user info to request for downstream handlers to use
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };
    
    req.sessionToken = sessionToken;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole - Factory function that creates role-checking middleware.
 * Returns middleware that verifies the authenticated user's role is in
 * the allowed list. Must be used AFTER requireAuth since it reads req.user.
 *
 * Usage: router.post('/admin-only', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // req.user should be set by requireAuth middleware running first
    if (!req.user) {
      errorResponse(res, 'Authentication required.', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      errorResponse(res, 'Access denied. Insufficient permissions.', 403);
      return;
    }

    next();
  };
}

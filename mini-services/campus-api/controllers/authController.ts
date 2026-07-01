// =============================================================================
// Authentication Controller
// =============================================================================
// Handles user login, logout, and session validation.
// Uses session-based authentication (not JWT) for better security with the
// campus ERP system. Sessions are stored in the database so admins can
// invalidate them, and they automatically expire after 24 hours.
//
// Login flow:
//   1. User submits email + password
//   2. Password is verified against bcrypt hash in DB
//   3. Session token (UUID) created in DB with 24h expiry
//   4. Token set as httpOnly cookie (client can't read it via JS → XSS protection)
//   5. Token ALSO returned in response body as `sessionToken` — frontend stores
//      it and sends as Authorization: Bearer <token> header on subsequent requests.
//      This fallback is essential for cross-site iframe contexts (e.g., sandbox
//      preview panel) where SameSite=Lax cookies are blocked by the browser.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * POST /api/auth/login
 * Authenticates user with email and password, creates a session.
 * Returns user data and sets a session cookie.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

// Find user by email. We need the password hash for comparison.
const user = await prisma.user.findUnique({ where: { email } });



if (!user) {
  errorResponse(res, 'Invalid email or password.', 401);
  return;
}

const resetRequest =
  await prisma.passwordResetRequest.findFirst({

    where: {

      userId: user.id,

      status: 'APPROVED',

      oneTimeLogin: true,

      used: false

    }

  });

let isPasswordValid = false;

if (resetRequest) {

  isPasswordValid = true;

} else {

  isPasswordValid =
    await bcrypt.compare(password, user.password);

}

if (!isPasswordValid) {

  const rejected =
    await prisma.passwordResetRequest.findFirst({

      where: {

        userId: user.id,

        status: 'REJECTED',

        used: false

      }

    });

  if (rejected) {

    errorResponse(

      res,

      'Your password reset request was rejected by the administrator.',

      403

    );

    return;

  }

  errorResponse(

    res,

    'Invalid email or password.',

    401

  );

  return;

}

    // Check if user account is active (admin may have deactivated it)
    if (!user.isActive) {
      errorResponse(res, 'Account has been deactivated. Contact administrator.', 403);
      return;
    }

    // Generate a unique session token using UUID v4.
    // This token will be the "key" that authenticates future requests.
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store session in database so we can look it up on subsequent requests
    // and invalidate it on logout or when it expires.
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        role: user.role,
        expiresAt,
      },
    });

    // Set the session token as an httpOnly cookie.
    // httpOnly prevents JavaScript from accessing it (XSS protection).
    // sameSite: 'lax' prevents CSRF while allowing top-level navigations.
    // maxAge matches the session expiry (24 hours).
    res.cookie('campus_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      secure: false, // Set to true in production with HTTPS
      path: '/',
    });
   if (resetRequest) {

  await prisma.passwordResetRequest.update({

    where: {

      id: resetRequest.id

    },

    data: {

      oneTimeLogin: false

    }

  });

}
    // Return user info + session token in response body.
    // The sessionToken is needed by the frontend to send as Authorization header
    // in cross-site iframe contexts where the httpOnly cookie is blocked.
    // The cookie is still set as the primary auth mechanism for same-site access.
    successResponse(res, 'Login successful.', {

  id: user.id,

  email: user.email,

  name: user.name,

  role: user.role,

  avatar: user.avatar,

  sessionToken: token,

  forcePasswordReset: !!resetRequest

});
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Destroys the current session by removing it from the database
 * and clearing the session cookie.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Check both cookie and Authorization header for session token
    let sessionToken = req.cookies?.campus_session;
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (sessionToken) {
      // Delete the session from DB so the token can no longer be used
      await prisma.session.deleteMany({ where: { token: sessionToken } });
    }

    // Clear the cookie from the browser
    res.clearCookie('campus_session', { path: '/' });

    successResponse(res, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Used by the frontend on page load to restore session state.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.user is set by the requireAuth middleware
    if (!req.user) {
      errorResponse(res, 'Not authenticated.', 401);
      return;
    }

    // Fetch fresh user data from DB (in case profile was updated)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        student: {
          include: {
            department: { select: { id: true, name: true, code: true } },
          },
        },
        teacher: {
          include: {
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!user) {
      errorResponse(res, 'User not found.', 404);
      return;
    }

    successResponse(res, 'User profile retrieved.', user);
  } catch (err) {
    next(err);
  }
}
export async function requestPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {

      errorResponse(
        res,
        'No account exists with this email.',
        404
      );

      return;

    }

    if (user.role === 'admin') {

      errorResponse(
        res,
        'Administrators cannot request password reset.',
        403
      );

      return;

    }

    const pending =
      await prisma.passwordResetRequest.findFirst({

        where: {

          userId: user.id,

          status: 'PENDING'

        }

      });

    if (pending) {

      errorResponse(

        res,

        'A password reset request is already pending.',

        400

      );

      return;

    }

    await prisma.passwordResetRequest.create({

      data: {

        userId: user.id

      }

    });

    successResponse(

      res,

      'Password reset request has been sent to the administrator.'

    );

  } catch (err) {

    next(err);

  }

}

export async function getPasswordResetRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const requests =
      await prisma.passwordResetRequest.findMany({

        include: {

          user: {

            select: {

              id: true,

              name: true,

              email: true,

              role: true

            }

          }

        },

        orderBy: {

          requestedAt: 'desc'

        }

      });

    successResponse(

      res,

      'Password reset requests retrieved.',

      requests

    );

  } catch (err) {

    next(err);

  }

}
export async function approvePasswordResetRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const request =
      await prisma.passwordResetRequest.findUnique({

        where: {

          id: req.params.id

        },

        include: {

          user: true

        }

      });

    if (!request) {

      errorResponse(
        res,
        'Request not found.',
        404
      );

      return;

    }

    if (request.status !== 'PENDING') {

      errorResponse(
        res,
        'This request has already been processed.',
        400
      );

      return;

    }

    await prisma.passwordResetRequest.update({

      where: {

        id: request.id

      },

      data: {

        status: 'APPROVED',

        handledAt: new Date(),

        handledById: req.user!.id,

        handledByName: req.user!.name,

        oneTimeLogin: true

      }

    });

    successResponse(
      res,
      'Password reset request approved.'
    );

  } catch (err) {

    next(err);

  }

}
export async function rejectPasswordResetRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const request =
      await prisma.passwordResetRequest.findUnique({

        where: {

          id: req.params.id

        }

      });

    if (!request) {

      errorResponse(
        res,
        'Request not found.',
        404
      );

      return;

    }

    if (request.status !== 'PENDING') {

      errorResponse(
        res,
        'This request has already been processed.',
        400
      );

      return;

    }

    await prisma.passwordResetRequest.update({

      where: {

        id: request.id

      },

      data: {

        status: 'REJECTED',

        handledAt: new Date(),

        handledById: req.user!.id,

        handledByName: req.user!.name

      }

    });

    successResponse(
      res,
      'Password reset request rejected.'
    );

  } catch (err) {

    next(err);

  }

}
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    if (!req.user) {

      errorResponse(res, 'Unauthorized.', 401);

      return;

    }

    const { password } = req.body;

    const request =
      await prisma.passwordResetRequest.findFirst({

        where: {

          userId: req.user.id,

          status: 'APPROVED',

          used: false

        }

      });

    if (!request) {

      errorResponse(

        res,

        'No approved password reset request found.',

        403

      );

      return;

    }

    const hash =
      await bcrypt.hash(password, 10);

    await prisma.user.update({

      where: {

        id: req.user.id

      },

      data: {

        password: hash

      }

    });

    await prisma.passwordResetRequest.update({

      where: {

        id: request.id

      },

      data: {

        used: true,

        status: 'USED',

        oneTimeLogin: false

      }

    });

    successResponse(

      res,

      'Password changed successfully.'

    );

  } catch (err) {

    next(err);

  }

}
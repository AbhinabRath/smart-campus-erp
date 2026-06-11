// =============================================================================
// User Controller - User Management (Admin)
// =============================================================================
// CRUD operations for user accounts. Only admins can manage users.
// When creating a user, we also create the role-specific profile
// (Student or Teacher) in the same transaction to maintain data integrity.
//
// Passwords are always hashed with bcrypt before storage.
// Deactivation (soft delete) is preferred over hard delete to preserve
// referential integrity with historical data (attendance, marks, etc.).
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * GET /api/users
 * List users with optional filters (role, active status, search).
 */
export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, isActive, search } = req.query;

    const where: any = {};
    if (role) where.role = String(role);
    if (isActive !== undefined) where.isActive = String(isActive) === 'true';
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
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
            department: { select: { name: true, code: true } },
          },
        },
        teacher: {
          include: {
            department: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Users retrieved.', users);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:id
 * Get detailed information about a specific user.
 */
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    successResponse(res, 'User details retrieved.', user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users
 * Admin creates a new user with role-specific profile in a single transaction.
 * This ensures we never have a User without a corresponding Student/Teacher profile.
 */
export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name, role, departmentId, rollNumber, semester, section, academicYear, employeeId, specialization, designation } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      errorResponse(res, 'A user with this email already exists.', 409);
      return;
    }

    // Hash the password before storing (10 salt rounds for good security/performance balance)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use a transaction to create user + role-specific profile atomically
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
        },
      });

      // Create role-specific profile based on the user's role
      if (role === 'student') {
        await tx.student.create({
          data: {
            userId: newUser.id,
            rollNumber,
            semester: parseInt(String(semester)),
            departmentId,
            section: section || 'A',
            academicYear: academicYear || new Date().getFullYear().toString(),
          },
        });
      } else if (role === 'teacher') {
        await tx.teacher.create({
          data: {
            userId: newUser.id,
            employeeId,
            departmentId,
            specialization: specialization || null,
            designation: designation || 'Assistant Professor',
          },
        });
      }

      return newUser;
    });

    successResponse(res, 'User created successfully.', { id: user.id, email: user.email, name: user.name, role: user.role }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id
 * Update user information and role-specific profile.
 * Admin can update any user. Non-admin can only update their own profile
 * (and only name, avatar — not isActive or role).
 */
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, avatar, isActive, departmentId, semester, section, specialization, designation } = req.body;

    // Non-admin users can only update their own profile
    if (req.user?.role !== 'admin' && req.user?.id !== id) {
      errorResponse(res, 'You can only update your own profile.', 403);
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'User not found.', 404);
      return;
    }

    // Build update data - non-admin can only update name and avatar
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (req.user?.role === 'admin') {
      if (email !== undefined) updateData.email = email;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update role-specific profile if relevant fields are provided
    if (existing.role === 'student' && (semester || section || departmentId)) {
      await prisma.student.update({
        where: { userId: id },
        data: {
          semester: semester ? parseInt(String(semester)) : undefined,
          section: section || undefined,
          departmentId: departmentId || undefined,
        },
      });
    } else if (existing.role === 'teacher' && (specialization || designation || departmentId)) {
      await prisma.teacher.update({
        where: { userId: id },
        data: {
          specialization: specialization || undefined,
          designation: designation || undefined,
          departmentId: departmentId || undefined,
        },
      });
    }

    successResponse(res, 'User updated successfully.', user);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:id/password
 * Change password for a user. Must be the user themselves.
 */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Users can only change their own password
    if (req.user?.id !== id) {
      errorResponse(res, 'You can only change your own password.', 403);
      return;
    }

    if (!currentPassword || !newPassword) {
      errorResponse(res, 'Current password and new password are required.', 400);
      return;
    }

    if (newPassword.length < 6) {
      errorResponse(res, 'New password must be at least 6 characters.', 400);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      errorResponse(res, 'User not found.', 404);
      return;
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      errorResponse(res, 'Current password is incorrect.', 401);
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    successResponse(res, 'Password changed successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:id
 * Deactivate a user account (soft delete). We don't hard-delete because
 * historical records (attendance, marks) reference this user.
 */
export async function deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'User not found.', 404);
      return;
    }

    // Soft delete: just mark as inactive instead of removing from DB
    // This preserves referential integrity with historical data
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Also invalidate all active sessions for this user
    await prisma.session.deleteMany({ where: { userId: id } });

    successResponse(res, 'User deactivated successfully.');
  } catch (err) {
    next(err);
  }
}

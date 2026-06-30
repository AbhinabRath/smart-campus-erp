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

import fs from 'fs';
import path from 'path';
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
export async function getPublicProfiles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const search = String(req.query.search || '');

    const users = await prisma.user.findMany({
      where: {
        role: {
  in:
    req.user?.role === 'admin'
      ? ['student', 'teacher', 'admin']
      : ['student', 'teacher']
},
        isActive: true,
        OR: [
          {
            name: {
              contains: search
            }
          }
        ]
      },

      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,

        student: {
          include: {
            department: true
          }
        },

        teacher: {
          include: {
            department: true
          }
        }
      }
    });

    successResponse(
      res,
      'Public profiles retrieved',
      users
    );
  } catch (err) {
    next(err);
  }
}
export async function getPublicProfileById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.params.id
      },

      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,

        student: {
          include: {
            department: true
          }
        },

        teacher: {
          include: {
            department: true
          }
        }
      }
    });

    if (!user) {
      return errorResponse(
        res,
        'User not found',
        404
      );
    }
let performanceRadar: {
  name: string;
  percentage: number;
}[] = [];

let marksAverage = 0;

if (user.student) {

  const marks = await prisma.mark.findMany({
    where: {
      studentId: user.student.id
    },

    include: {
      subject: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const subjectMap = new Map();

  for (const mark of marks) {

    const subjectName =
      mark.subject?.name || 'Unknown';

    if (!subjectMap.has(subjectName)) {

      subjectMap.set(subjectName, {
        name: subjectName,
        total: 0,
        maxTotal: 0
      });
    }

    const existing =
      subjectMap.get(subjectName);

    existing.total += mark.marksObtained;
    existing.maxTotal += mark.totalMarks;
  }

  performanceRadar =
    Array.from(subjectMap.values())
      .map((item: any) => ({
        name: item.name,

        percentage: Math.round(
          (item.total / item.maxTotal) * 100
        )
      }));

  marksAverage =
    performanceRadar.length > 0
      ? Math.round(
          performanceRadar.reduce(
            (sum: number, item: any) =>
              sum + item.percentage,
            0
          ) /
            performanceRadar.length
        )
      : 0;
}

    successResponse(
  res,
  'Profile retrieved',
  {
    ...user,
    performanceRadar,
    marksAverage
  }
);
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
    const {
  email,
  password,
  name,
  role,
  departmentId,
  rollNumber,
  semester,
  section,
  academicYear,
  guardianName,
  guardianPhone,

  employeeId,
  specialization,
  designation,

  researchArea,
  phoneNumber,
  qualification,
  officeRoom
} = req.body;

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
      let derivedDepartmentId = departmentId;
let derivedRollNumber = rollNumber;

if (role === 'student') {
  const emailPrefix = email.split('@')[0];

  const match = emailPrefix.match(/^([a-zA-Z]+)(\d+)$/);

  if (!match) {
    throw new Error('Invalid student email format.');
  }

  const deptCode = match[1].toUpperCase();
  const rollDigits = match[2];

  const department = await tx.department.findFirst({
    where: {
      code: deptCode,
    },
  });

  if (!department) {
    throw new Error(`Department ${deptCode} not found.`);
  }

  derivedDepartmentId = department.id;
  derivedRollNumber = `${deptCode}${rollDigits}`;
}
      // Create role-specific profile based on the user's role
      if (role === 'student') {
       const sem = parseInt(String(semester));

const currentYear = new Date().getFullYear();

const admissionYear =
  sem <= 2 ? currentYear :
  sem <= 4 ? currentYear - 1 :
  sem <= 6 ? currentYear - 2 :
  currentYear - 3;

await tx.student.create({
  data: {
    userId: newUser.id,
    rollNumber: derivedRollNumber,
    semester: sem,
    departmentId: derivedDepartmentId!,
    section: section || 'A',

    admissionYear: admissionYear,
    academicYear: `${admissionYear}-${admissionYear + 1}`,
    collegeEmail: email,

    guardianName: guardianName || null,
    guardianPhone: guardianPhone || null,
  },
});
      } else if (role === 'teacher') {

  const emailPrefix = email.split('@')[0].toLowerCase();

let deptCode = '';

if (emailPrefix.startsWith('cse')) deptCode = 'CSE';
else if (emailPrefix.startsWith('ece')) deptCode = 'ECE';
else if (emailPrefix.startsWith('eee')) deptCode = 'EEE';
else if (emailPrefix.startsWith('me')) deptCode = 'ME';
else if (emailPrefix.startsWith('ce')) deptCode = 'CE';
else if (emailPrefix.startsWith('che')) deptCode = 'CHE';
else if (emailPrefix.startsWith('bt')) deptCode = 'BT';
else if (emailPrefix.startsWith('mnc')) deptCode = 'MNC';
else if (emailPrefix.startsWith('as')) deptCode = 'AS';
else if (emailPrefix.startsWith('aids')) deptCode = 'AIDS';

  const department = await tx.department.findFirst({
    where: {
      code: deptCode,
    },
  });

  if (!department) {
    throw new Error(`Department ${deptCode} not found.`);
  }

  await tx.teacher.create({
    data: {
      userId: newUser.id,

      employeeId,

      departmentId: department.id,

      designation: designation || 'Assistant Professor',

      specialization: researchArea,

      researchArea: researchArea,

      phoneNumber: phoneNumber || null,

      qualification: qualification || null,

      officeRoom: officeRoom || null,
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
    const {
  name,
  email,
  avatar,
  isActive,

  departmentId,
  semester,
  section,

  guardianName,
  guardianPhone,

  specialization,
  designation,
  researchArea,
  qualification,
  officeRoom,
  phoneNumber,
  bio
} = req.body;

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
    if (existing.role === 'student') {
  await prisma.student.update({
    where: { userId: id },
    data: {
      semester: semester ? parseInt(String(semester)) : undefined,
      section: section || undefined,
      departmentId: departmentId || undefined,

      guardianName:
        guardianName !== undefined ? guardianName : undefined,

      guardianPhone:
        guardianPhone !== undefined ? guardianPhone : undefined,
        bio:
  bio !== undefined ? bio : undefined,
    },
  });
} else if (existing.role === 'teacher') {
      await prisma.teacher.update({
        where: { userId: id },
        data: {
  specialization: specialization || undefined,
  designation: designation || undefined,
  departmentId: departmentId || undefined,

  researchArea:
    researchArea !== undefined ? researchArea : undefined,

  qualification:
    qualification !== undefined ? qualification : undefined,

  officeRoom:
    officeRoom !== undefined ? officeRoom : undefined,

  phoneNumber:
    phoneNumber !== undefined ? phoneNumber : undefined,
    bio:
  bio !== undefined ? bio : undefined,
},
      });
    }

    successResponse(res, 'User updated successfully.', user);
  } catch (err) {
    next(err);
  }
}
//Avatar Upload
export async function uploadAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      errorResponse(res, 'No file uploaded.', 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      errorResponse(res, 'User not found.', 404);
      return;
    }

    if (
      user.avatar &&
      user.avatar.startsWith('/uploads/avatars/')
    ) {
      const oldPath = path.join(
        __dirname,
        '..',
        user.avatar
      );

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const avatarPath =
      result.secure_url;

    await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: avatarPath,
      },
    });

    successResponse(
      res,
      'Avatar uploaded successfully.',
      {
        avatar: avatarPath,
      }
    );
  } catch (err) {
    next(err);
  }
}
export async function removeAvatar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      errorResponse(res, 'User not found.', 404);
      return;
    }

    if (
      user.avatar &&
      user.avatar.startsWith('/uploads/avatars/')
    ) {
      const avatarPath = path.join(
        __dirname,
        '..',
        user.avatar
      );

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: null
      }
    });

    successResponse(
      res,
      'Avatar removed successfully.'
    );
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
export async function reactivateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      errorResponse(res, 'User not found.', 404);
      return;
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
      },
    });

    successResponse(res, 'User reactivated successfully.');
  } catch (err) {
    next(err);
  }
}

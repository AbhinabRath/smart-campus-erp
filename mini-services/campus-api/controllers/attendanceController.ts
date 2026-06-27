// =============================================================================
// Attendance Controller - QR-Based Attendance Management
// =============================================================================
// Implements the QR-based attendance flow:
//   1. Teacher creates an attendance session → system generates a unique QR token
//   2. QR code image is generated from the token (base64 data URL)
//   3. Teacher displays QR code to students (via projector, etc.)
//   4. Student scans QR and submits the token to mark attendance
//   5. System validates: session exists, is active, student belongs to the
//      correct department/semester/section, no duplicate marking
//   6. Teacher can end the session and view attendance reports
//
// The QR token approach prevents students from marking attendance without
// being physically present (they need to see the QR code displayed in class).
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * POST /api/attendance/sessions
 * Teacher creates a new attendance session. Generates a unique QR code token
 * that students will scan to mark their attendance.
 */
export async function createAttendanceSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, departmentId, semester, section, duration } = req.body;
    const teacherId = req.user!.id;

    // Verify the teacher profile exists and belongs to this user
    const teacher = await prisma.teacher.findUnique({ where: { userId: teacherId } });
    if (!teacher) {
      errorResponse(res, 'Teacher profile not found.', 404);
      return;
    }

    // Generate a unique QR token. UUID v4 provides sufficient randomness
    // to prevent students from guessing tokens for other sessions.
    const currentQrToken = uuidv4();

    // Create the attendance session in the database
    const session = await prisma.attendanceSession.create({
      data: {
        teacherId: teacher.id,
        subjectId,
        departmentId,
        semester,
        section: section || 'A',
        qrCode: currentQrToken,

currentQrToken,

tokenExpiresAt: new Date(Date.now() + 10000),

tokenRotationSec: 10,

allowedNetworkPrefix: req.body.allowedNetworkPrefix ?? null,
        duration: duration || 15,
        isActive: true,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    // Generate QR code image as a base64 data URL.
    // The QR encodes the token string; when scanned, the student's app
    // sends this token to the mark-attendance endpoint.
   const qrCodeDataUrl = await QRCode.toDataURL(
  JSON.stringify({
    sessionId: session.id,
    token: session.currentQrToken,
  }),
  {
    width: 300,
    margin: 2,
  }
);

    successResponse(res, 'Attendance session created.', { session, qrCode: qrCodeDataUrl }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/sessions
 * Returns attendance sessions. Teachers see their own sessions;
 * admins see all active sessions.
 */
export async function getAttendanceSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isActive, subjectId } = req.query;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    // Build filter conditions based on query parameters
    const where: any = {};
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;
    if (subjectId) where.subjectId = String(subjectId);

    // Teachers can only see their own sessions to avoid data leakage
    if (userRole === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (teacher) where.teacherId = teacher.id;
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
        teacher: {
          include: { user: { select: { name: true } } },
        },
        _count: { select: { records: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Attendance sessions retrieved.', sessions);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/sessions/:id
 * Returns detailed information about a specific attendance session,
 * including all attendance records (who marked and when).
 */
export async function getAttendanceSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
        teacher: {
          include: { user: { select: { name: true } } },
        },
        records: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      errorResponse(res, 'Attendance session not found.', 404);
      return;
    }

    successResponse(res, 'Attendance session retrieved.', session);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/attendance/sessions/:id/end
 * Teacher manually ends an attendance session. This prevents any further
 * attendance marking via the QR code for this session.
 */
export async function endAttendanceSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) {
      errorResponse(res, 'Attendance session not found.', 404);
      return;
    }

    if (!session.isActive) {
      errorResponse(res, 'Session is already ended.', 400);
      return;
    }

    // Mark session as inactive and record the end time
    const updatedSession = await prisma.attendanceSession.update({
      where: { id },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    successResponse(res, 'Attendance session ended.', updatedSession);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/attendance/mark
 * Student marks their attendance by submitting the QR code token.
 * Multiple validation layers ensure attendance integrity:
 *   1. Student must be authenticated
 *   2. Session must exist (found by QR token)
 *   3. Session must be active
 *   4. Student must be in the correct semester/section
 *   5. Duplicate prevention (unique constraint + check)
 */
export async function markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId, token } = req.body;
    const userId = req.user!.id;

    // Layer 1: Find student profile for this user
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { user: { select: { name: true } } },
    });

    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    // Layer 2: Find the attendance session by QR token
    const session = await prisma.attendanceSession.findUnique({
  where: {
    id: sessionId,
  },
});

    if (!session) {
      errorResponse(res, 'Invalid QR code. Session not found.', 404);
      return;
    }
if (session.currentQrToken !== token) {
  errorResponse(
    res,
    'This QR Code has expired. Please scan the latest QR.',
    400
  );
  return;
}

if (
  session.tokenExpiresAt &&
  new Date() > session.tokenExpiresAt
) {
  errorResponse(
    res,
    'This QR Code has expired. Please scan the latest QR.',
    400
  );
  return;
}
    // Layer 3: Session must be active (not ended by teacher or expired)
    if (!session.isActive) {
      errorResponse(res, 'This attendance session has ended.', 400);
      return;
    }

    // Layer 4: Check if session has exceeded its duration
    const sessionEndTime = new Date(session.startedAt.getTime() + session.duration * 60 * 1000);
    if (new Date() > sessionEndTime) {
      // Auto-expire the session
      await prisma.attendanceSession.update({
        where: { id: session.id },
        data: { isActive: false, endedAt: new Date() },
      });
      errorResponse(res, 'This attendance session has expired.', 400);
      return;
    }

    // Layer 5: Verify student belongs to the correct department/semester/section
    if (
      student.departmentId !== session.departmentId ||
      student.semester !== session.semester ||
      student.section !== session.section
    ) {
      errorResponse(res, 'You are not eligible for this attendance session.', 403);
      return;
    }
if (session.allowedNetworkPrefix) {

  const clientIp =
    (req.ip ||
      req.socket.remoteAddress ||
      '')
      .replace('::ffff:', '');

  if (!clientIp.startsWith(session.allowedNetworkPrefix)) {

    errorResponse(
      res,
      'You are not connected to the classroom network.',
      403
    );

    return;

  }

}
    // Layer 6: Duplicate prevention - check if student already marked attendance
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        studentId_attendanceSessionId: {
          studentId: student.id,
          attendanceSessionId: session.id,
        },
      },
    });

    if (existingRecord) {
      errorResponse(res, 'You have already marked attendance for this session.', 409);
      return;
    }

    // All validations passed — create the attendance record
    const record = await prisma.attendanceRecord.create({
      data: {
  studentId: student.id,

  attendanceSessionId: session.id,

  ipAddress:
    req.ip || req.socket.remoteAddress || null,

  tokenUsed: token,

  deviceInfo:
    req.headers['user-agent'] || null,
},
    });

    successResponse(res, 'Attendance marked successfully.', record, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/my-attendance
 * Student views their own attendance records across all sessions.
 * Supports filtering by subject and date range.
 */
export async function getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { subjectId, from, to } = req.query;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    // Build filter for attendance sessions (by subject, date range)
    const sessionWhere: any = {};
    if (subjectId) sessionWhere.subjectId = String(subjectId);
    if (from || to) {
      sessionWhere.startedAt = {};
      if (from) sessionWhere.startedAt.gte = new Date(String(from));
      if (to) sessionWhere.startedAt.lte = new Date(String(to));
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentId: student.id,
        session: sessionWhere.subjectId || sessionWhere.startedAt ? sessionWhere : undefined,
      },
      include: {
        session: {
          include: {
            subject: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { markedAt: 'desc' },
    });

    successResponse(res, 'Attendance records retrieved.', records);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/reports/:sessionId
 * Teacher views the attendance report for a specific session.
 * Shows who attended and who was absent from the target class.
 */
export async function getAttendanceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId } = req.params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
        records: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      errorResponse(res, 'Attendance session not found.', 404);
      return;
    }

    // Get all students in the class (same department, semester, section)
    // so we can determine who was ABSENT (didn't mark attendance)
    const allStudents = await prisma.student.findMany({
      where: {
        departmentId: session.departmentId,
        semester: session.semester,
        section: session.section,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const attendedStudentIds = new Set(session.records.map(r => r.studentId));
    const absentStudents = allStudents.filter(s => !attendedStudentIds.has(s.id));

    successResponse(res, 'Attendance report generated.', {
      session: {
        id: session.id,
        subject: session.subject,
        department: session.department,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        isActive: session.isActive,
      },
      present: session.records.map(r => ({
        studentId: r.studentId,
        name: r.student.user.name,
        rollNumber: r.student.rollNumber,
        markedAt: r.markedAt,
      })),
      absent: absentStudents.map(s => ({
        studentId: s.id,
        name: s.user.name,
        rollNumber: s.rollNumber,
      })),
      totalStudents: allStudents.length,
      presentCount: session.records.length,
      absentCount: absentStudents.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/attendance/percentage
 * Student views their overall attendance percentage and per-subject breakdown.
 * Useful for students to track if they're meeting the 75% attendance requirement.
 */
export async function getAttendancePercentage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    // Get total sessions for this student's class (department + semester + section)
    const totalSessions = await prisma.attendanceSession.findMany({
      where: {
        departmentId: student.departmentId,
        semester: student.semester,
        section: student.section,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    // Get sessions the student attended
    const attendedRecords = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: {
        session: {
          include: { subject: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    // Calculate overall percentage
    const overallPercentage = totalSessions.length > 0
      ? (attendedRecords.length / totalSessions.length) * 100
      : 0;

    // Calculate per-subject percentage
    const subjectMap = new Map<string, { name: string; code: string; total: number; attended: number }>();
    for (const s of totalSessions) {
      const existing = subjectMap.get(s.subjectId) || { name: s.subject.name, code: s.subject.code, total: 0, attended: 0 };
      existing.total += 1;
      subjectMap.set(s.subjectId, existing);
    }

    for (const r of attendedRecords) {
      const existing = subjectMap.get(r.session.subjectId);
      if (existing) existing.attended += 1;
    }

    const subjectBreakdown = Array.from(subjectMap.entries()).map(([subjectId, data]) => ({
      subjectId,
      subjectName: data.name,
      subjectCode: data.code,
      totalSessions: data.total,
      attendedSessions: data.attended,
      percentage: data.total > 0 ? (data.attended / data.total) * 100 : 0,
    }));

    successResponse(res, 'Attendance percentage calculated.', {
      overallPercentage: Math.round(overallPercentage * 100) / 100,
      totalSessions: totalSessions.length,
      attendedSessions: attendedRecords.length,
      subjectBreakdown,
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshAttendanceQR(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { id } = req.params;

    const session =
      await prisma.attendanceSession.findUnique({
        where: { id }
      });

    if (!session) {
      errorResponse(res, 'Attendance session not found.', 404);
      return;
    }

    if (!session.isActive) {
      errorResponse(res, 'Attendance session already ended.', 400);
      return;
    }

    const token = uuidv4();

    const updated =
      await prisma.attendanceSession.update({

        where: { id },

        data: {

          qrCode: token,

          currentQrToken: token,

          tokenExpiresAt: new Date(Date.now() + 10000)

        }

      });

    const qrCodeDataUrl =
      await QRCode.toDataURL(

        JSON.stringify({

          sessionId: updated.id,

          token

        }),

        {

          width: 300,

          margin: 2

        }

      );

    successResponse(

      res,

      'QR refreshed.',

      {

        qrCode: qrCodeDataUrl,

        tokenExpiresAt: updated.tokenExpiresAt

      }

    );

  }

  catch (err) {

    next(err);

  }

}

export async function validatePRC(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const {
      rollNumber,
      subjectId,
      date,
      reason
    } = req.body;

    const student =
      await prisma.student.findUnique({
        where: {
          rollNumber
        },
        include: {
          user: true
        }
      });

    if (!student) {

      errorResponse(
        res,
        'Student not found.',
        404
      );

      return;
    }

    const subject =
      await prisma.subject.findUnique({
        where: {
          id: subjectId
        }
      });

    if (!subject) {

      errorResponse(
        res,
        'Subject not found.',
        404
      );

      return;
    }

    if (
      subject.departmentId !==
        student.departmentId ||

      subject.semester !==
        student.semester
    ) {

      errorResponse(
        res,
        'This subject does not belong to this student.',
        400
      );

      return;
    }

    const session =
      await prisma.attendanceSession.findFirst({

        where: {

          subjectId,

          departmentId:
            student.departmentId,

          semester:
            student.semester,

          section:
            student.section,

          startedAt: {

            gte: new Date(
              `${date}T00:00:00`
            ),

            lte: new Date(
              `${date}T23:59:59`
            )
          }
        }
      });

    if (!session) {

      errorResponse(
        res,
        'No attendance session found on that date.',
        404
      );

      return;
    }

    const existing =
      await prisma.attendanceRecord.findUnique({

        where: {

          studentId_attendanceSessionId: {

            studentId:
              student.id,

            attendanceSessionId:
              session.id
          }
        }
      });

    if (existing) {

      errorResponse(
        res,
        'Attendance already exists.',
        400
      );

      return;
    }

    successResponse(
      res,
      'Validation successful.',
      {
        studentId: student.id,
        sessionId: session.id,
        studentName:
          student.user.name,
        reason
      }
    );

  } catch (err) {

    next(err);

  }
}

export async function confirmPRC(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const {
      studentId,
      sessionId
    } = req.body;

    const record =
      await prisma.attendanceRecord.create({

        data: {

          studentId,

          attendanceSessionId:
            sessionId,

          ipAddress:
            'PRC_BY_ADMIN'
        }
      });

    successResponse(
      res,
      'PRC Applied Successfully.',
      record,
      201
    );

  } catch (err) {

    next(err);

  }
}

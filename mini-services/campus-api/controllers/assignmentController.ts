// =============================================================================
// Assignment Controller - Assignment & Submission Management
// =============================================================================
// Handles the full lifecycle of assignments:
//   - Teachers create assignments (with optional file attachments)
//   - Students submit their work (file upload)
//   - Teachers grade submissions and provide feedback
//
// File upload handling uses multer middleware (configured in routes).
// The assignment deadline is checked at submission time to mark late submissions.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * POST /api/assignments
 * Teacher creates a new assignment with optional file attachment.
 */
export async function createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, title, description, deadline, maxMarks, teacherId: bodyTeacherId } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Admin can create assignments on behalf of any teacher by passing teacherId
    let teacherId: string;
    if (userRole === 'admin' && bodyTeacherId) {
      const teacherExists = await prisma.teacher.findUnique({ where: { id: bodyTeacherId } });
      if (!teacherExists) {
        errorResponse(res, 'Teacher not found.', 404);
        return;
      }
      teacherId = bodyTeacherId;
    } else {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (!teacher) {
        errorResponse(res, 'Teacher profile not found.', 404);
        return;
      }
      teacherId = teacher.id;
    }

    // File attachment is optional (multer stores it in req.file if present)
    const fileData: any = {};
    if (req.file) {
      fileData.filePath = req.file.path;
      fileData.fileName = req.file.originalname;
    }

    const assignment = await prisma.assignment.create({
      data: {
        teacherId,
        subjectId,
        title,
        description,
        deadline: new Date(deadline),
        maxMarks: maxMarks ? parseFloat(String(maxMarks)) : 100,
        ...fileData,
      },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    successResponse(res, 'Assignment created successfully.', assignment, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/assignments/:id
 * Teacher updates an existing assignment.
 */
export async function updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, deadline, maxMarks } = req.body;

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Assignment not found.', 404);
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (deadline) updateData.deadline = new Date(deadline);
    if (maxMarks) updateData.maxMarks = parseFloat(String(maxMarks));

    // If a new file is uploaded, replace the old one
    if (req.file) {
      updateData.filePath = req.file.path;
      updateData.fileName = req.file.originalname;
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
      include: {
        subject: { select: { name: true, code: true } },
      },
    });

    successResponse(res, 'Assignment updated successfully.', assignment);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/assignments/:id
 * Teacher deletes an assignment and all its submissions (cascade).
 */
export async function deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) {
      errorResponse(res, 'Assignment not found.', 404);
      return;
    }

    await prisma.assignment.delete({ where: { id } });
    successResponse(res, 'Assignment deleted successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assignments
 * List assignments with optional filters (subject, teacher).
 * Students see assignments for their subjects; teachers see their own.
 */
export async function getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, teacherId } = req.query;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    const where: any = {};

if (subjectId) {
  where.subjectId = String(subjectId);
}

/*
|--------------------------------------------------------------------------
| Teacher View
|--------------------------------------------------------------------------
*/
if (userRole === 'teacher') {

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId,
    },
  });

  if (teacher) {
    where.teacherId = teacher.id;
  }
}

/*
|--------------------------------------------------------------------------
| Student View
|--------------------------------------------------------------------------
*/
else if (userRole === 'student') {

  const student = await prisma.student.findUnique({
    where: {
      userId,
    },
  });

  if (!student) {
    errorResponse(res, 'Student profile not found.', 404);
    return;
  }

  where.subject = {
    departmentId: student.departmentId,
    semester: student.semester,
  };
}

/*
|--------------------------------------------------------------------------
| Admin Filters
|--------------------------------------------------------------------------
*/
else if (teacherId) {

  where.teacherId = String(teacherId);

}

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
  subject: { select: { name: true, code: true } },

  teacher: {
    include: {
      user: {
        select: { name: true }
      }
    }
  },

  submissions: {
    include: {
      student: {
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }
    }
  },

  _count: {
    select: {
      submissions: true
    }
  }
},
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Assignments retrieved.', assignments);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assignments/:id
 * Get detailed information about a specific assignment.
 */
export async function getAssignmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true, code: true, semester: true } },
        teacher: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { submissions: true } },
      },
    });

    if (!assignment) {
      errorResponse(res, 'Assignment not found.', 404);
      return;
    }

    successResponse(res, 'Assignment details retrieved.', assignment);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/assignments/:id/submit
 * Student submits their work for an assignment. Can include a file upload
 * or text content. Late submissions are flagged automatically.
 */
export async function submitAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    // Verify the assignment exists
   const assignment =
  await prisma.assignment.findUnique({
    where: {
      id,
    },

    include: {
      subject: {
        select: {
          departmentId: true,
          semester: true,
        },
      },
    },
  });
    if (!assignment) {
      errorResponse(res, 'Assignment not found.', 404);
      return;
    }
    if (
  assignment.subject.departmentId !== student.departmentId ||
  assignment.subject.semester !== student.semester
) {
  errorResponse(
    res,
    'You are not eligible to submit this assignment.',
    403
  );
  return;
}

    // Check if student already submitted (unique constraint: assignmentId + studentId)
    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: id,
          studentId: student.id,
        },
      },
    });

    if (existingSubmission) {
      errorResponse(res, 'You have already submitted this assignment.', 409);
      return;
    }

    // Determine if submission is late (past the deadline)
    const isLate = new Date() > new Date(assignment.deadline);
    const status = isLate ? 'late' : 'submitted';

    // File upload data (optional)
    const fileData: any = {};
    if (req.file) {
      fileData.filePath = req.file.path;
      fileData.fileName = req.file.originalname;
    }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: id,
        studentId: student.id,
        content: content || null,
        status,
        ...fileData,
      },
      include: {
        assignment: { select: { title: true, maxMarks: true } },
      },
    });

    successResponse(res, isLate ? 'Assignment submitted (late).' : 'Assignment submitted successfully.', submission, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assignments/:id/submissions
 * Teacher views all submissions for a specific assignment.
 */
export async function getSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      errorResponse(res, 'Assignment not found.', 404);
      return;
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    successResponse(res, 'Submissions retrieved.', submissions);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/assignments/submissions/:submissionId/grade
 * Teacher grades a student's submission with marks and feedback.
 */
export async function gradeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { submissionId } = req.params;
    const { marksObtained, feedback } = req.body;

    const existing = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId } });
    if (!existing) {
      errorResponse(res, 'Submission not found.', 404);
      return;
    }

    const submission = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        marksObtained: marksObtained !== undefined ? parseFloat(String(marksObtained)) : null,
        feedback: feedback || null,
        status: 'graded',
      },
    });

    successResponse(res, 'Submission graded successfully.', submission);
  } catch (err) {
    next(err);
  }
}

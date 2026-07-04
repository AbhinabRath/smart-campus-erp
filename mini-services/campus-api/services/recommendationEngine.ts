// =============================================================================
// Recommendation Engine Service - Rule-Based Logic
// =============================================================================
// Generates personalized recommendations for students based on their academic
// data. This is a RULE-BASED system (no ML/AI) that applies deterministic
// rules to identify areas where a student needs improvement.
//
// Rules implemented:
//   1. Overall attendance < 75% → recommend attending classes regularly
//   2. Subject-specific attendance < 75% → recommend attending that subject
//   3. Subject marks < 50% → recommend focusing on that subject
//   4. Pending (unsubmitted) assignments → recommend completing them
//   5. Career goal mapping for CS students → recommend DSA, DBMS, OS, etc.
//   6. Low internal marks → recommend focusing on upcoming exams
//
// Each rule is independent and produces zero or more recommendations.
// All recommendations are stored in the DB so students can view history.
// =============================================================================

import prisma from '../config/database';

// Career goal mapping: recommended focus areas for CS students
// These are subjects/skills that are critical for common CS career paths
const CAREER_RECOMMENDATIONS_CS = [
  { title: 'Master Data Structures & Algorithms', description: 'DSA is fundamental for technical interviews and problem-solving. Practice on LeetCode or HackerRank.', type: 'career', priority: 'high' },
  { title: 'Strengthen Database Management Skills', description: 'DBMS knowledge is essential for backend development. Focus on SQL queries and normalization.', type: 'career', priority: 'high' },
  { title: 'Build Operating Systems Concepts', description: 'OS concepts like process management and memory allocation are frequently tested in interviews.', type: 'career', priority: 'medium' },
  { title: 'Work on Personal Projects', description: 'Build 2-3 projects to showcase on your resume. Full-stack web or mobile apps are great starting points.', type: 'career', priority: 'medium' },
  { title: 'Practice Aptitude & Logical Reasoning', description: 'Many companies include aptitude rounds. Practice quantitative and logical reasoning regularly.', type: 'career', priority: 'medium' },
];

/**
 * Generate recommendations for a specific student.
 * Applies all rules and stores new recommendations in the database.
 * Avoids creating duplicate recommendations for the same issue.
 *
 * @param studentUserId - The User ID of the student
 * @returns Array of newly created recommendations
 */
export async function generateRecommendations(studentUserId: string) {
  await prisma.recommendation.deleteMany({
  where: {
    studentId: studentUserId
  }
});
  // Find the student profile with their academic details
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
    include: {
      department: { select: { code: true, name: true } },
      user: { select: { name: true } },
    },
  });

  if (!student) {
    throw new Error('Student profile not found.');
  }

  // Fetch existing unread recommendations to avoid duplicates
  const existingRecommendations = await prisma.recommendation.findMany({
    where: { studentId: studentUserId, isRead: false },
  });

  const existingTitles = new Set(existingRecommendations.map(r => r.title));
  const newRecommendations: any[] = [];

  // ── RULE 1: Overall attendance < 75% ──
  // Students below 75% attendance risk being barred from exams in many institutions.
  const totalSessions = await prisma.attendanceSession.count({
    where: {
      departmentId: student.departmentId,
      semester: student.semester,
      section: student.section,
    },
  });

  const attendedSessions = await prisma.attendanceRecord.count({
    where: { studentId: student.id },
  });

  const overallAttendancePct = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;

  if (overallAttendancePct < 75) {
    const title = 'Improve Overall Attendance';
    if (!existingTitles.has(title)) {
      newRecommendations.push({
        studentId: studentUserId,
        type: 'attendance',
        title,
        description: `Your overall attendance is ${Math.round(overallAttendancePct)}%, which is below the 75% minimum requirement. Attend upcoming classes regularly to avoid being barred from exams.`,
        priority: 'high',
      });
    }
  }

  // ── RULE 2: Subject-specific attendance < 75% ──
  // Even if overall attendance is fine, a student might be missing one specific subject.
  const subjectAttendance = await prisma.attendanceSession.groupBy({
    by: ['subjectId'],
    where: {
      departmentId: student.departmentId,
      semester: student.semester,
      section: student.section,
    },
    _count: { id: true },
  });

  const studentRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id },
    include: { session: { select: { subjectId: true, subject: { select: { name: true } } } } },
  });

  // Count attended sessions per subject
  const attendedBySubject = new Map<string, number>();
  for (const r of studentRecords) {
    attendedBySubject.set(r.session.subjectId, (attendedBySubject.get(r.session.subjectId) || 0) + 1);
  }

  for (const sa of subjectAttendance) {
    const attended = attendedBySubject.get(sa.subjectId) || 0;
    const pct = sa._count.id > 0 ? (attended / sa._count.id) * 100 : 100;
    if (pct < 75) {
      // Get subject name from the records we already have
      const record = studentRecords.find(r => r.session.subjectId === sa.subjectId);
      const subjectName = record?.session.subject.name || 'this subject';
      const title = `Attend ${subjectName} Classes Regularly`;
      if (!existingTitles.has(title)) {
        newRecommendations.push({
          studentId: studentUserId,
          type: 'attendance',
          title,
          description: `Your attendance in ${subjectName} is ${Math.round(pct)}%. You need at least 75% to be eligible for exams in this subject.`,
          priority: 'high',
        });
      }
    }
  }

  // ── RULE 3: Subject marks < 50% ──
  // Below 50% indicates the student is struggling with the subject material.
  const marks = await prisma.mark.findMany({
    where: { studentId: student.id },
    include: { subject: { select: { name: true, code: true } } },
  });

  for (const m of marks) {
    const pct = (m.marksObtained / m.totalMarks) * 100;
    if (pct < 50) {
      const title = `Focus on ${m.subject.name}`;
      if (!existingTitles.has(title)) {
        newRecommendations.push({
          studentId: studentUserId,
          type: 'academic',
          title,
          description: `Your score in ${m.subject.name} (${m.subject.code}) is ${Math.round(pct)}%. Review study materials, attend tutorials, and practice more problems in this subject.`,
          priority: m.examType.startsWith('internal') ? 'high' : 'medium',
          actionUrl: `/materials?subjectId=${m.subjectId}`,
        });
      }
    }
  }

  // ── RULE 4: Pending assignments ──
  // Unsubmitted assignments directly affect grades.
  const studentDepartment = student.department;

const pendingAssignmentsCount =
  await prisma.assignment.count({
    where: {
      subject: {
        departmentId: student.departmentId,
        semester: student.semester,
      },

      deadline: {
        gte: new Date(),
      },

      submissions: {
        none: {
          studentId: student.id,
        },
      },
    },
  });

if (pendingAssignmentsCount > 0) {
    const title = 'Complete Pending Assignments';
    if (!existingTitles.has(title)) {
      newRecommendations.push({
        studentId: studentUserId,
        type: 'assignment',
        title,
        description: `You have ${pendingAssignmentsCount} pending assignment(s). Completing them on time is crucial for your internal marks. Check the assignments page for details.`,
        priority: 'high',
        actionUrl: '/assignments',
      });
    }
  }

  // ── RULE 5: Career goal mapping for CS students ──
  // CS students need to focus on specific skills for placement.
  if (studentDepartment.code === 'CS' || studentDepartment.code === 'CSE') {
    for (const rec of CAREER_RECOMMENDATIONS_CS) {
      if (!existingTitles.has(rec.title)) {
        newRecommendations.push({
          studentId: studentUserId,
          type: rec.type,
          title: rec.title,
          description: rec.description,
          priority: rec.priority as 'high' | 'medium' | 'low',
        });
      }
    }
  }
// ── RULE 6: Pending semester fees ──
const feeStructure = await prisma.fee_structure.findFirst({
  where: {
    semester: student.semester,
  },
});

const feePayments = await prisma.fee_payments.aggregate({
  where: {
    studentId: student.id,
    semester: student.semester,
  },
  _sum: {
    amountPaid: true,
  },
});

if (feeStructure) {
  const totalFee =
    Number(feeStructure.tuitionFee) +
    Number(feeStructure.hostelFee) +
    Number(feeStructure.examFee) +
    Number(feeStructure.libraryFee) +
    Number(feeStructure.miscFee);

  const paid = Number(feePayments._sum.amountPaid || 0);
  const pending = Math.max(0, totalFee - paid);

  if (pending > 0) {
    const title = 'Pending Semester Fees';

    if (!existingTitles.has(title)) {
      newRecommendations.push({
        studentId: studentUserId,
        type: 'academic',
        title,
        description: `You still have ₹${pending.toLocaleString()} pending for Semester ${student.semester}. Please complete the payment at the earliest.`,
        priority: 'high',
      });
    }
  }
}
  // ── RULE 7: Low internal marks → focus on upcoming exams ──
  const internalMarks = marks.filter(m => m.examType.startsWith('internal'));
  const lowInternalSubjects = internalMarks.filter(m => (m.marksObtained / m.totalMarks) * 100 < 50);

  if (lowInternalSubjects.length > 0) {
    const title = 'Prepare for Upcoming Exams';
    if (!existingTitles.has(title)) {
      const subjectsList = lowInternalSubjects.map(m => m.subject.name).join(', ');
      newRecommendations.push({
        studentId: studentUserId,
        type: 'academic',
        title,
        description: `Your internal marks are low in: ${subjectsList}. Focus on these subjects for the upcoming exams. Review previous question papers and study materials.`,
        priority: 'high',
      });
    }
  }

  // Store all new recommendations in the database
  if (newRecommendations.length > 0) {
    await prisma.recommendation.createMany({ data: newRecommendations });
  }

  return newRecommendations;
}

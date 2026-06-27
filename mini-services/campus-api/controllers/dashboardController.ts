// =============================================================================
// Dashboard Controller - Aggregated Dashboard Data
// =============================================================================
// Provides role-specific dashboard data in a single API call.
// Instead of the frontend making 5-6 separate requests to assemble a dashboard,
// these endpoints aggregate all needed data in one response.
//
// This reduces:
//   - Network round trips (1 request instead of 6)
//   - Loading time (parallel DB queries on the server)
//   - Frontend complexity (no need to merge multiple responses)
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

/**
 * GET /api/dashboard/student
 * Student dashboard: attendance %, recent attendance, marks overview,
 * upcoming assignments, notices, today's timetable, recent materials, recommendations.
 */
export async function getStudentDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const student = await prisma.student.findUnique({
      where: { userId },
      include: { department: { select: { name: true, code: true } } },
    });

    if (!student) {
      errorResponse(res, 'Student profile not found.', 404);
      return;
    }

    // Run all queries in parallel for performance
   const [
  totalSessions,
  attendedCount,
  recentAttendance,
  marks,
  assignments,
  notices,
  todayTimetable,
  recentMaterials,
  subjectAttendanceSessions,
  pendingFees,
] = await Promise.all([
      // Total attendance sessions for this student's class
      prisma.attendanceSession.count({
        where: {
          departmentId: student.departmentId,
          semester: student.semester,
          section: student.section,
        },
      }),

      // Sessions this student attended
      prisma.attendanceRecord.count({
        where: { studentId: student.id },
      }),

      // Recent 5 attendance records
      prisma.attendanceRecord.findMany({
        where: { studentId: student.id },
        include: {
          session: {
            include: { subject: { select: { name: true, code: true } } },
          },
        },
        orderBy: { markedAt: 'desc' },
        take: 5,
      }),

      // All marks for summary
      prisma.mark.findMany({
        where: { studentId: student.id },
        include: { subject: { select: { name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
      }),

      // Upcoming assignments (deadline in the future)
     (async () => {
  const submittedAssignments =
    await prisma.assignmentSubmission.findMany({
      where: {
        studentId: student.id,
      },
      select: {
        assignmentId: true,
      },
    });

  const submittedIds =
    submittedAssignments.map(
      (s) => s.assignmentId
    );

  return prisma.assignment.findMany({
    where: {
      subject: {
        departmentId: student.departmentId,
        semester: student.semester,
      },

      deadline: {
        gte: new Date(),
      },

      id: {
        notIn: submittedIds,
      },
    },

    include: {
      subject: {
        select: {
          name: true,
          code: true,
        },
      },

      teacher: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },

    orderBy: {
      deadline: 'asc',
    },

    take: 5,
  });
})(),

      // Latest notices for students
      prisma.notice.findMany({
        where: {
          OR: [{ targetRole: 'all' }, { targetRole: 'student' }],
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Today's timetable
      prisma.timetable.findMany({
        where: {
          departmentId: student.departmentId,
          semester: student.semester,
          section: student.section,
          dayOfWeek: new Date().getDay() || 7, // Convert Sunday=0 to Monday-based
        },
        include: {
          subject: { select: { name: true, code: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
        orderBy: { periodNumber: 'asc' },
      }),

      // Recent study materials for student's subjects
      prisma.studyMaterial.findMany({
        where: {
          subject: {
            departmentId: student.departmentId,
            semester: student.semester,
          },
        },
        include: {
          subject: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

     prisma.attendanceSession.findMany({
  where: {
    departmentId: student.departmentId,
    semester: student.semester,
    section: student.section,
  },
  include: {
    subject: true,
    records: {
      where: {
        studentId: student.id,
      },
    },
  },
}),

prisma.fee_payments.aggregate({
  where: {
    studentId: student.id,
    semester: student.semester,
  },
  _sum: {
    amountPaid: true,
  },
}),
    ]);

    // Calculate attendance percentage
    const attendancePercentage = totalSessions > 0
      ? Math.round((attendedCount / totalSessions) * 10000) / 100
      : 0;

    // Calculate marks overview
    const totalMarksObtained = marks.reduce((sum, m) => sum + m.marksObtained, 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.totalMarks, 0);
    const marksPercentage = totalMaxMarks > 0
      ? Math.round((totalMarksObtained / totalMaxMarks) * 10000) / 100
      : 0;
const subjectMap = new Map();

subjectAttendanceSessions.forEach((session) => {
  const key = session.subject.id;

  if (!subjectMap.has(key)) {
    subjectMap.set(key, {
      subject: session.subject.name,
      attended: 0,
      total: 0,
    });
  }

  const item = subjectMap.get(key);

  item.total++;

  if (session.records.length > 0) {
    item.attended++;
  }
});
const feeStructure = await prisma.fee_structure.findFirst({
  where: {
    semester: student.semester,
  },
});

const totalFee =
  Number(feeStructure?.tuitionFee || 0) +
  Number(feeStructure?.hostelFee || 0) +
  Number(feeStructure?.examFee || 0) +
  Number(feeStructure?.libraryFee || 0) +
  Number(feeStructure?.miscFee || 0);

const pendingAmount = Math.max(
  0,
  totalFee - Number(pendingFees._sum.amountPaid || 0)
);


const subjectAttendance: any[] = [];

subjectMap.forEach((item) => {
  const percentage =
    item.total > 0
      ? Math.round(
          (item.attended / item.total) * 100
        )
      : 0;

  let classesNeeded = 0;

  if (percentage < 75) {
    classesNeeded = Math.ceil(
      ((0.75 * item.total) - item.attended) /
      0.25
    );
  }

  subjectAttendance.push({
    subject: item.subject,
    attended: item.attended,
    total: item.total,
    percentage,
    classesNeeded,
  });
});
    successResponse(res, 'Student dashboard data loaded.', {
      student: {
        name: req.user!.name,
        rollNumber: student.rollNumber,
        semester: student.semester,
        section: student.section,
        department: student.department,
      },
      attendance: {
        percentage: attendancePercentage,
        totalSessions,
        attended: attendedCount,
        recentRecords: recentAttendance,
        subjectAttendance,
      },
      marks: {
        percentage: marksPercentage,
        totalSubjects:
new Set(
  marks.map(
    (m) => m.subjectId
  )
).size,
        recentMarks: marks,
      },
      assignments,
      notices,
      timetable: todayTimetable,
      materials: recentMaterials,
      feeSummary: {
  pendingAmount,
  hasPendingFees: pendingAmount > 0,
},
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/teacher
 * Teacher dashboard: active sessions, assignments, materials, marks stats, notices.
 */
export async function getTeacherDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { department: { select: { name: true, code: true } } },
    });

    if (!teacher) {
      errorResponse(res, 'Teacher profile not found.', 404);
      return;
    }

    const [
  activeSessions,
  recentAssignments,
  recentMaterials,
  marksCount,
  recentNotices,
  todaySchedule,
  teacherAttendanceSessions,
  teacherAttendanceRecords,
  allStudents,
] = await Promise.all([
      // Active attendance sessions
      prisma.attendanceSession.findMany({
        where: { teacherId: teacher.id, isActive: true },
        include: {
          subject: { select: { name: true, code: true } },
          _count: { select: { records: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),

      // Recent assignments created by this teacher
      prisma.assignment.findMany({
  where: {
    teacherId: teacher.id,
  },

  include: {
    subject: {
      select: {
        id: true,
        name: true,
        code: true,
        departmentId: true,
        semester: true,
      },
    },

    _count: {
      select: {
        submissions: true,
      },
    },
  },

  orderBy: {
    createdAt: 'desc',
  },

  take: 5,
}),

      // Recent materials uploaded
      prisma.studyMaterial.findMany({
        where: { teacherId: teacher.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
 
      // Total marks entries by this teacher
      prisma.mark.count({ where: { teacherId: teacher.id } }),

      // Latest notices for teachers
      prisma.notice.findMany({
        where: { OR: [{ targetRole: 'all' }, { targetRole: 'teacher' }] },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Count of students in teacher's department
    
      prisma.timetable.findMany({
  where: {
    teacherId: teacher.id,
    dayOfWeek: new Date().getDay(),
  },
  include: {
  subject: {
    select: {
      name: true,
      code: true,
    },
  },
  department: {
    select: {
      code: true,
      name: true,
    },
  },
},
  orderBy: {
    periodNumber: 'asc',
  },
}),
prisma.attendanceSession.findMany({
  where: {
    teacherId: teacher.id,
  },

  select: {
    id: true,
    startedAt: true,
    departmentId: true,
    semester: true,
    section: true,

    _count: {
      select: {
        records: true,
      },
    },
  },

  orderBy: {
    startedAt: 'asc',
  },
}),
  

prisma.attendanceRecord.findMany({
  where: {
    session: {
      teacherId: teacher.id,
    },
  },
  include: {
    session: {
      select: {
        startedAt: true,
        departmentId: true,
        semester: true,
        section: true,
      },
    },
  },
}),
prisma.student.findMany({
  select: {
    departmentId: true,
    semester: true,
    section: true,
  },
}),
    ]);
    const sectionStudentCount = new Map<string, number>();

allStudents.forEach((student) => {

  const key =
    `${student.departmentId}-${student.semester}-${student.section}`;

  sectionStudentCount.set(
    key,
    (sectionStudentCount.get(key) || 0) + 1
  );

});

    
const attendanceTrendData = (() => {
  const today = new Date();

  const currentMonday = new Date(today);
  currentMonday.setDate(
    today.getDate() - ((today.getDay() + 6) % 7)
  );
  currentMonday.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const day = new Date(currentMonday);
    day.setDate(currentMonday.getDate() + i);
    return day;
  });

  return weekDays.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const sessions = teacherAttendanceSessions.filter(
      (s) =>
        s.startedAt >= day &&
        s.startedAt < nextDay
    );
   let possibleAttendances = 0;

sessions.forEach((session) => {

  const key =
    `${session.departmentId}-${session.semester}-${session.section}`;

  possibleAttendances +=
    sectionStudentCount.get(key) || 0;

});
    const presentCount = teacherAttendanceRecords.filter(
  (r) =>
    r.session.startedAt >= day &&
    r.session.startedAt < nextDay
).length;


const attendance =
  possibleAttendances > 0
    ? Math.min(
        100,
        Math.round((presentCount / possibleAttendances) * 100)
      )
    : 0;

const absence =
  possibleAttendances > 0
    ? 100 - attendance
    : 0;

return {
  day: day.toLocaleDateString('en-US', {
    weekday: 'short',
  }),
  present: attendance,
  absent: absence,
};
  });
})();
const assignmentsWithEligibility = await Promise.all(
  recentAssignments.map(async (assignment) => {

    const eligibleStudents = await prisma.student.count({
      where: {
        departmentId: assignment.subject.departmentId,
        semester: assignment.subject.semester,
      },
    });

    const submissionRate =
      eligibleStudents > 0
        ? Math.round(
            (assignment._count.submissions / eligibleStudents) * 100
          )
        : 0;

    return {
      id: assignment.id,
      title: assignment.title,
      deadline: assignment.deadline,
      subject: {
        name: assignment.subject.name,
        code: assignment.subject.code,
      },
      _count: {
        submissions: assignment._count.submissions,
      },
      eligibleStudents,
      submissionRate,
    };
  })
);

const totalStudents = allStudents.filter(
  (s) => s.departmentId === teacher.departmentId
).length;
    successResponse(res, 'Teacher dashboard data loaded.', {
      teacher: {
        name: req.user!.name,
        employeeId: teacher.employeeId,
        designation: teacher.designation,
        department: teacher.department,
      },
      activeSessions,
      assignments: assignmentsWithEligibility,
materials: recentMaterials,
marksCount,
notices: recentNotices,
attendanceTrendData,
todaySchedule,
totalStudents,
    });
  } catch (err) {
    next(err);
  }
}


/**
 * GET /api/dashboard/admin
 * Admin dashboard: user counts, department stats, recent activity, analytics summary.
 */
export async function getAdminDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
  const [
  totalStudents,
  totalTeachers,
  totalAdmins,
  departments,
  recentSessions,
  recentNotices,
  pendingLeaves,
  totalSubjects,
  attendanceSessions,
  attendanceRecords,
  students,
  marks,
] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.department.findMany({
        include: {
          _count: { select: { students: true, teachers: true, subjects: true } },
        },
      }),
      // Recent attendance sessions
      prisma.attendanceSession.findMany({
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          subject: { select: { name: true } },
          _count: { select: { records: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      
      // Recent notices
      prisma.notice.findMany({
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Pending leave requests
      prisma.leaveRequest.count({ where: { status: 'pending' } }),
      prisma.subject.count(),
      prisma.attendanceSession.findMany({
  include: {
    _count: {
      select: {
        records: true,
      },
    },
  },
  orderBy: {
    startedAt: 'asc',
  },
}),
prisma.attendanceRecord.findMany({
  select: {
    attendanceSessionId: true,
    session: {
      select: {
        startedAt: true,
      },
    },
  },
}),

prisma.student.findMany({
  select: {
    departmentId: true,
    semester: true,
    section: true,
  },
}),

prisma.mark.findMany({
  include: {
    student: {
      select: {
        departmentId: true,
      },
    },
  },
}),
]);
const sectionStudentCount = new Map<string, number>();

students.forEach((student) => {
  const key =
    `${student.departmentId}-${student.semester}-${student.section}`;

  sectionStudentCount.set(
    key,
    (sectionStudentCount.get(key) || 0) + 1
  );
});
const attendanceTrendData = (() => {
  const today = new Date();

  const currentMonday = new Date(today);
  currentMonday.setDate(
    today.getDate() - ((today.getDay() + 6) % 7)
  );
  currentMonday.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const day = new Date(currentMonday);
    day.setDate(currentMonday.getDate() + i);
    return day;
  });

  return weekDays.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const sessions = attendanceSessions.filter(
      (s) =>
        s.startedAt >= day &&
        s.startedAt < nextDay
    );

   let possibleAttendances = 0;

sessions.forEach((session) => {
  const key =
    `${session.departmentId}-${session.semester}-${session.section}`;

  possibleAttendances +=
    sectionStudentCount.get(key) || 0;
});

    const present = attendanceRecords.filter(
      (r) =>
        r.session.startedAt >= day &&
        r.session.startedAt < nextDay
    ).length;

    const attendance =
      possibleAttendances > 0
        ? Math.round((present / possibleAttendances) * 100)
        : 0;

    const absence = 100 - attendance;

    return {
      day: day.toLocaleDateString('en-US', {
        weekday: 'short',
      }),
      present: attendance,
      absent: absence,
    };
  });
})();
const sessionDepartmentMap = new Map(
  attendanceSessions.map((s) => [s.id, s.departmentId])
);
const departmentPerformance = departments.map((dept) => {
  const deptStudents = students.filter(
    (s) => s.departmentId === dept.id
  );

  const deptAttendanceSessions = attendanceSessions.filter(
    (s) => s.departmentId === dept.id
  );

 const deptAttendanceRecords = attendanceRecords.filter(
  (record) =>
    sessionDepartmentMap.get(record.attendanceSessionId) === dept.id
);

  let possibleAttendances = 0;

  deptAttendanceSessions.forEach((session) => {
    possibleAttendances += deptStudents.filter(
      (student) => student.semester === session.semester
    ).length;
  });

  const avgAttendance =
    possibleAttendances > 0
      ? Math.round(
          (deptAttendanceRecords.length /
            possibleAttendances) *
            100
        )
      : 0;

  const deptMarks = marks.filter(
    (m) => m.student.departmentId === dept.id
  );

  const avgMarks =
    deptMarks.length > 0
      ? Math.round(
          deptMarks.reduce(
            (sum, mark) =>
              sum +
              (mark.marksObtained /
                mark.totalMarks) *
                100,
            0
          ) / deptMarks.length
        )
      : 0;

  return {
    department: dept.code,
    avgAttendance,
    avgMarks,
  };
});


    successResponse(res, 'Admin dashboard data loaded.', {
      userStats: {
        totalStudents,
        totalTeachers,
        totalAdmins,
        totalUsers: totalStudents + totalTeachers + totalAdmins,
      },
      departments,
      totalSubjects,
      attendanceSessions,
      attendanceTrendData,
      departmentPerformance,
      recentActivity: {
        attendanceSessions: recentSessions,
        notices: recentNotices,
      },
      pendingLeaves,
    });
  } catch (err) {
    next(err);
  }
}

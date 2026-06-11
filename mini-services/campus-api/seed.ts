// =============================================================================
// Database Seed Script - Creates initial data for the Smart Campus ERP
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:/home/z/my-project/db/custom.db',
    },
  },
});

async function seed() {
  console.log('Seeding database...');

  // ── Create Departments ──
  const csDept = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { name: 'Computer Science', code: 'CS' },
  });

  const ecDept = await prisma.department.upsert({
    where: { code: 'EC' },
    update: {},
    create: { name: 'Electronics & Communication', code: 'EC' },
  });

  const meDept = await prisma.department.upsert({
    where: { code: 'ME' },
    update: {},
    create: { name: 'Mechanical Engineering', code: 'ME' },
  });

  console.log('Departments created.');

  // ── Create Subjects ──
  const subjects = [
    { name: 'Database Management Systems', code: 'CS301', departmentId: csDept.id, semester: 3, credits: 4, type: 'theory' },
    { name: 'Data Structures & Algorithms', code: 'CS302', departmentId: csDept.id, semester: 3, credits: 4, type: 'theory' },
    { name: 'Operating Systems', code: 'CS303', departmentId: csDept.id, semester: 3, credits: 3, type: 'theory' },
    { name: 'Computer Networks', code: 'CS304', departmentId: csDept.id, semester: 3, credits: 3, type: 'theory' },
    { name: 'DBMS Lab', code: 'CS351', departmentId: csDept.id, semester: 3, credits: 2, type: 'lab' },
    { name: 'Digital Signal Processing', code: 'EC301', departmentId: ecDept.id, semester: 3, credits: 4, type: 'theory' },
    { name: 'Thermodynamics', code: 'ME301', departmentId: meDept.id, semester: 3, credits: 4, type: 'theory' },
  ];

  for (const subj of subjects) {
    await prisma.subject.upsert({
      where: { code: subj.code },
      update: {},
      create: subj,
    });
  }
  console.log('Subjects created.');

  // ── Create Admin User ──
  const adminHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@campus.edu' },
    update: {},
    create: {
      email: 'admin@campus.edu',
      password: adminHash,
      name: 'Campus Admin',
      role: 'admin',
    },
  });
  console.log('Admin user created.');

  // ── Create Teacher Users ──
  const teacherData = [
    { name: 'Dr. Sarah Johnson', email: 'sarah.j@campus.edu', employeeId: 'FAC201', deptId: csDept.id, specialization: 'Machine Learning, Data Structures' },
    { name: 'Prof. Michael Chen', email: 'michael.c@campus.edu', employeeId: 'FAC202', deptId: csDept.id, specialization: 'Database Systems, Cloud Computing' },
    { name: 'Dr. Emily Davis', email: 'emily.d@campus.edu', employeeId: 'FAC203', deptId: ecDept.id, specialization: 'Signal Processing' },
  ];

  const teachers: any[] = [];
  for (const t of teacherData) {
    const hash = await bcrypt.hash('teacher123', 10);
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        password: hash,
        name: t.name,
        role: 'teacher',
      },
    });
    const teacher = await prisma.teacher.upsert({
      where: { employeeId: t.employeeId },
      update: {},
      create: {
        userId: user.id,
        employeeId: t.employeeId,
        departmentId: t.deptId,
        specialization: t.specialization,
        designation: 'Professor',
      },
    });
    teachers.push(teacher);
  }
  console.log('Teachers created.');

  // ── Create Student Users ──
  const studentData = [
    { name: 'Alice Williams', email: 'alice.w@campus.edu', rollNumber: 'CS2023001', deptId: csDept.id, semester: 3, section: 'A' },
    { name: 'Bob Brown', email: 'bob.b@campus.edu', rollNumber: 'CS2023002', deptId: csDept.id, semester: 3, section: 'A' },
    { name: 'Charlie Wilson', email: 'charlie.w@campus.edu', rollNumber: 'CS2023003', deptId: csDept.id, semester: 3, section: 'A' },
    { name: 'Diana Lee', email: 'diana.l@campus.edu', rollNumber: 'CS2023004', deptId: csDept.id, semester: 3, section: 'B' },
    { name: 'Edward Kim', email: 'edward.k@campus.edu', rollNumber: 'CS2023005', deptId: csDept.id, semester: 3, section: 'B' },
    { name: 'Fiona Garcia', email: 'fiona.g@campus.edu', rollNumber: 'EC2023001', deptId: ecDept.id, semester: 3, section: 'A' },
  ];

  for (const s of studentData) {
    const hash = await bcrypt.hash('student123', 10);
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: hash,
        name: s.name,
        role: 'student',
      },
    });
    await prisma.student.upsert({
      where: { rollNumber: s.rollNumber },
      update: {},
      create: {
        userId: user.id,
        rollNumber: s.rollNumber,
        departmentId: s.deptId,
        semester: s.semester,
        section: s.section,
        academicYear: '2024-2025',
      },
    });
  }
  console.log('Students created.');

  // ── Create Sample Notices (idempotent - check count first) ──
  const existingNotices = await prisma.notice.count();
  if (existingNotices === 0) {
    await prisma.notice.createMany({
      data: [
        { authorId: adminUser.id, title: 'Welcome to Smart Campus ERP', content: 'Welcome to the new Smart Campus ERP system! Please explore all features and report any issues.', targetRole: 'all', priority: 'high', isPinned: true },
        { authorId: adminUser.id, title: 'Mid-Semester Exam Schedule Released', content: 'The mid-semester examination schedule for all departments has been released. Check your timetable for details.', targetRole: 'student', priority: 'urgent' },
        { authorId: adminUser.id, title: 'Faculty Development Program', content: 'A faculty development workshop on modern teaching methods will be held next week. Attendance is mandatory.', targetRole: 'teacher', priority: 'high' },
      ],
    });
    console.log('Notices created.');
  } else {
    console.log('Notices already exist, skipping.');
  }

  // ── Create Sample Timetable ──
  const csSubjects = await prisma.subject.findMany({ where: { departmentId: csDept.id, semester: 3 } });
  if (csSubjects.length >= 3 && teachers.length >= 2) {
    const timetableEntries = [
      { departmentId: csDept.id, semester: 3, section: 'A', dayOfWeek: 1, periodNumber: 1, subjectId: csSubjects[0].id, teacherId: teachers[0].id, roomNumber: 'Room 301', startTime: '09:00', endTime: '09:50' },
      { departmentId: csDept.id, semester: 3, section: 'A', dayOfWeek: 1, periodNumber: 2, subjectId: csSubjects[1].id, teacherId: teachers[1].id, roomNumber: 'Room 302', startTime: '09:50', endTime: '10:40' },
      { departmentId: csDept.id, semester: 3, section: 'A', dayOfWeek: 1, periodNumber: 3, subjectId: csSubjects[2].id, teacherId: teachers[0].id, roomNumber: 'Room 301', startTime: '11:00', endTime: '11:50' },
      { departmentId: csDept.id, semester: 3, section: 'A', dayOfWeek: 2, periodNumber: 1, subjectId: csSubjects[3].id, teacherId: teachers[1].id, roomNumber: 'Room 303', startTime: '09:00', endTime: '09:50' },
      { departmentId: csDept.id, semester: 3, section: 'A', dayOfWeek: 2, periodNumber: 2, subjectId: csSubjects[0].id, teacherId: teachers[0].id, roomNumber: 'Room 301', startTime: '09:50', endTime: '10:40' },
      { departmentId: csDept.id, semester: 3, section: 'A', dayOfWeek: 3, periodNumber: 1, subjectId: csSubjects[1].id, teacherId: teachers[0].id, roomNumber: 'Room 302', startTime: '09:00', endTime: '09:50' },
      { departmentId: csDept.id, semester: 3, section: 'A', dayOfWeek: 3, periodNumber: 2, subjectId: csSubjects[2].id, teacherId: teachers[1].id, roomNumber: 'Room 301', startTime: '09:50', endTime: '10:40' },
    ];
    
    for (const entry of timetableEntries) {
      await prisma.timetable.upsert({
        where: {
          departmentId_semester_section_dayOfWeek_periodNumber: {
            departmentId: entry.departmentId,
            semester: entry.semester,
            section: entry.section,
            dayOfWeek: entry.dayOfWeek,
            periodNumber: entry.periodNumber,
          },
        },
        update: {},
        create: entry,
      });
    }
    console.log('Timetable entries created.');
  }

  // ── Get student and teacher records for seeding ──
  const studentUsers = await prisma.user.findMany({ where: { role: 'student' }, include: { student: true } });
  const teacherUsers = await prisma.user.findMany({ where: { role: 'teacher' }, include: { teacher: true } });
  const allSubjects = await prisma.subject.findMany();

  // ── Create Sample Marks ──
  // Only create marks if none exist yet
  const existingMarks = await prisma.mark.count();
  if (existingMarks === 0 && teacherUsers.length >= 2 && allSubjects.length >= 4) {
    const csSubjectCodes = ['CS301', 'CS302', 'CS303', 'CS304'];
    const csSubjs = allSubjects.filter(s => csSubjectCodes.includes(s.code));

    // Marks for CS students in CS subjects
    for (const su of studentUsers) {
      if (!su.student) continue;
      if (!su.student.departmentId) continue;
      const dept = await prisma.department.findUnique({ where: { id: su.student.departmentId } });
      if (dept?.code !== 'CS') continue;

      for (const subj of csSubjs) {
        // Internal 1
        const i1Score = 15 + Math.floor(Math.random() * 25); // 15-39 out of 50
        await prisma.mark.create({
          data: {
            studentId: su.student.id,
            subjectId: subj.id,
            teacherId: teacherUsers[0].teacher!.id,
            examType: 'internal1',
            marksObtained: i1Score,
            totalMarks: 50,
            remarks: i1Score >= 25 ? 'Good performance' : i1Score >= 20 ? 'Average, needs improvement' : 'Below average, attend extra classes',
          },
        });

        // Internal 2
        const i2Score = 12 + Math.floor(Math.random() * 28); // 12-39 out of 50
        await prisma.mark.create({
          data: {
            studentId: su.student.id,
            subjectId: subj.id,
            teacherId: teacherUsers[1 % teacherUsers.length].teacher!.id,
            examType: 'internal2',
            marksObtained: i2Score,
            totalMarks: 50,
            remarks: i2Score >= 25 ? 'Good performance' : i2Score >= 20 ? 'Average, needs improvement' : 'Below average, attend extra classes',
          },
        });

        // Assignment marks
        const assignScore = 8 + Math.floor(Math.random() * 17); // 8-24 out of 25
        await prisma.mark.create({
          data: {
            studentId: su.student.id,
            subjectId: subj.id,
            teacherId: teacherUsers[0].teacher!.id,
            examType: 'assignment',
            marksObtained: assignScore,
            totalMarks: 25,
            remarks: assignScore >= 18 ? 'Excellent work' : assignScore >= 12 ? 'Good effort' : 'Needs more effort',
          },
        });
      }
    }

    // Marks for EC student in EC subject
    const ecStudent = studentUsers.find(su => su.student?.rollNumber === 'EC2023001');
    const ecSubj = allSubjects.find(s => s.code === 'EC301');
    if (ecStudent?.student && ecSubj) {
      await prisma.mark.create({
        data: {
          studentId: ecStudent.student.id,
          subjectId: ecSubj.id,
          teacherId: teacherUsers[2]?.teacher?.id || teacherUsers[0].teacher!.id,
          examType: 'internal1',
          marksObtained: 32,
          totalMarks: 50,
          remarks: 'Good performance',
        },
      });
      await prisma.mark.create({
        data: {
          studentId: ecStudent.student.id,
          subjectId: ecSubj.id,
          teacherId: teacherUsers[2]?.teacher?.id || teacherUsers[0].teacher!.id,
          examType: 'internal2',
          marksObtained: 28,
          totalMarks: 50,
          remarks: 'Average, needs improvement',
        },
      });
    }

    console.log('Marks created.');
  } else {
    console.log('Marks already exist or prerequisites missing, skipping.');
  }

  // ── Create Sample Assignments ──
  const existingAssignments = await prisma.assignment.count();
  if (existingAssignments === 0 && teacherUsers.length >= 2 && allSubjects.length >= 4) {
    const csSubjs = allSubjects.filter(s => ['CS301', 'CS302', 'CS303', 'CS304'].includes(s.code));

    const assignmentsData = [
      { title: 'ER Diagram for Library Management', description: 'Design an Entity-Relationship diagram for a library management system with at least 5 entities and proper relationships.', subjectId: csSubjs[0]?.id, teacherId: teacherUsers[1]?.teacher?.id, deadline: new Date('2026-06-20T23:59:59'), maxMarks: 25 },
      { title: 'Binary Tree Traversal Implementation', description: 'Implement in-order, pre-order, and post-order traversals for a binary tree. Submit code with test cases.', subjectId: csSubjs[1]?.id, teacherId: teacherUsers[0]?.teacher?.id, deadline: new Date('2026-06-18T23:59:59'), maxMarks: 25 },
      { title: 'Process Scheduling Simulation', description: 'Simulate FCFS, SJF, and Round Robin scheduling algorithms. Compare their average waiting times.', subjectId: csSubjs[2]?.id, teacherId: teacherUsers[0]?.teacher?.id, deadline: new Date('2026-06-25T23:59:59'), maxMarks: 50 },
      { title: 'TCP/IP Socket Programming', description: 'Write a client-server chat application using TCP/IP sockets in Python or C. Demonstrate multi-client support.', subjectId: csSubjs[3]?.id, teacherId: teacherUsers[1]?.teacher?.id, deadline: new Date('2026-06-22T23:59:59'), maxMarks: 50 },
      { title: 'Normalization Exercise', description: 'Normalize the given unnormalized table to 3NF. Show each step with functional dependencies.', subjectId: csSubjs[0]?.id, teacherId: teacherUsers[1]?.teacher?.id, deadline: new Date('2026-06-15T23:59:59'), maxMarks: 25 },
      { title: 'Graph Algorithms Implementation', description: 'Implement BFS and DFS for an undirected graph. Also implement Dijkstra\'s shortest path algorithm.', subjectId: csSubjs[1]?.id, teacherId: teacherUsers[0]?.teacher?.id, deadline: new Date('2026-07-01T23:59:59'), maxMarks: 50 },
    ];

    for (const a of assignmentsData) {
      if (!a.subjectId || !a.teacherId) continue;
      await prisma.assignment.create({ data: a });
    }

    // Create some submissions for the first assignment
    const firstAssignment = await prisma.assignment.findFirst({ where: { title: 'ER Diagram for Library Management' } });
    if (firstAssignment) {
      const csStudents = studentUsers.filter(su => su.student?.departmentId === csDept.id);
      for (let i = 0; i < Math.min(4, csStudents.length); i++) {
        const su = csStudents[i];
        if (!su.student) continue;
        await prisma.assignmentSubmission.create({
          data: {
            assignmentId: firstAssignment.id,
            studentId: su.student.id,
            content: `Submission by ${su.name} for ER Diagram assignment`,
            status: i < 2 ? 'graded' : 'submitted',
            marksObtained: i < 2 ? (18 + i * 3) : null,
            feedback: i < 2 ? `Good work${i === 0 ? ', excellent diagram' : ''}` : null,
            submittedAt: new Date(Date.now() - (3 - i) * 86400000),
          },
        });
      }
    }

    console.log('Assignments and submissions created.');
  } else {
    console.log('Assignments already exist or prerequisites missing, skipping.');
  }

  // ── Create Sample Study Materials ──
  const existingMaterials = await prisma.studyMaterial.count();
  if (existingMaterials === 0 && teacherUsers.length >= 2 && allSubjects.length >= 4) {
    const csSubjs = allSubjects.filter(s => ['CS301', 'CS302', 'CS303', 'CS304'].includes(s.code));

    const materialsData = [
      { title: 'DBMS Unit 1 - Introduction to Databases', description: 'Lecture slides covering database concepts, architecture, and data models', subjectId: csSubjs[0]?.id, teacherId: teacherUsers[1]?.teacher?.id, fileName: 'DBMS_Unit1_Intro.pdf', filePath: '/uploads/dbms-unit1.pdf', fileType: 'pdf', fileSize: 2450000 },
      { title: 'DBMS Unit 2 - ER Model & Relational Model', description: 'Notes on Entity-Relationship model, relational model, and mapping', subjectId: csSubjs[0]?.id, teacherId: teacherUsers[1]?.teacher?.id, fileName: 'DBMS_Unit2_ER_Model.pptx', filePath: '/uploads/dbms-unit2.pptx', fileType: 'pptx', fileSize: 3800000 },
      { title: 'DSA - Trees and Graphs', description: 'Comprehensive notes on tree data structures and graph algorithms', subjectId: csSubjs[1]?.id, teacherId: teacherUsers[0]?.teacher?.id, fileName: 'DSA_Trees_Graphs.pdf', filePath: '/uploads/dsa-trees.pdf', fileType: 'pdf', fileSize: 4200000 },
      { title: 'DSA Lab - Sorting Algorithms', description: 'Lab manual with implementations of various sorting algorithms', subjectId: csSubjs[1]?.id, teacherId: teacherUsers[0]?.teacher?.id, fileName: 'DSA_Lab_Sorting.docx', filePath: '/uploads/dsa-lab.docx', fileType: 'docx', fileSize: 1200000 },
      { title: 'OS - Process Management', description: 'Lecture notes on process management, scheduling, and synchronization', subjectId: csSubjs[2]?.id, teacherId: teacherUsers[0]?.teacher?.id, fileName: 'OS_Process_Management.pdf', filePath: '/uploads/os-process.pdf', fileType: 'pdf', fileSize: 3100000 },
      { title: 'Computer Networks - TCP/IP Model', description: 'Detailed notes on TCP/IP protocol suite and OSI model comparison', subjectId: csSubjs[3]?.id, teacherId: teacherUsers[1]?.teacher?.id, fileName: 'CN_TCPIP_Model.pptx', filePath: '/uploads/cn-tcpip.pptx', fileType: 'pptx', fileSize: 5600000 },
      { title: 'DBMS SQL Practice Problems', description: '50 SQL practice problems with solutions for exam preparation', subjectId: csSubjs[0]?.id, teacherId: teacherUsers[1]?.teacher?.id, fileName: 'DBMS_SQL_Practice.pdf', filePath: '/uploads/dbms-sql.pdf', fileType: 'pdf', fileSize: 890000 },
      { title: 'OS Lab - Shell Scripting', description: 'Lab exercises for shell scripting and Linux commands', subjectId: csSubjs[2]?.id, teacherId: teacherUsers[0]?.teacher?.id, fileName: 'OS_Lab_Shell.pdf', filePath: '/uploads/os-shell.pdf', fileType: 'pdf', fileSize: 1500000 },
    ];

    for (const m of materialsData) {
      if (!m.subjectId || !m.teacherId) continue;
      await prisma.studyMaterial.create({ data: m });
    }

    console.log('Study materials created.');
  } else {
    console.log('Study materials already exist or prerequisites missing, skipping.');
  }

  // ── Create Sample Leave Requests ──
  const existingLeaves = await prisma.leaveRequest.count();
  if (existingLeaves === 0) {
    const csStudents = studentUsers.filter(su => su.student?.departmentId === csDept.id);

    const leavesData = [
      { userId: csStudents[0]?.id, type: 'sick', startDate: new Date('2026-06-08'), endDate: new Date('2026-06-09'), reason: 'Fever and cold, visited doctor', status: 'approved', approvedBy: adminUser.id, comments: 'Get well soon' },
      { userId: csStudents[1]?.id, type: 'casual', startDate: new Date('2026-06-15'), endDate: new Date('2026-06-15'), reason: 'Family function', status: 'approved', approvedBy: adminUser.id, comments: 'Approved' },
      { userId: csStudents[2]?.id, type: 'academic', startDate: new Date('2026-06-20'), endDate: new Date('2026-06-22'), reason: 'Attending hackathon at IIT Delhi', status: 'pending' },
      { userId: csStudents[3]?.id, type: 'sick', startDate: new Date('2026-06-12'), endDate: new Date('2026-06-14'), reason: 'Migraine, unable to attend classes', status: 'rejected', approvedBy: adminUser.id, comments: 'Please provide medical certificate' },
      { userId: csStudents[0]?.id, type: 'personal', startDate: new Date('2026-06-25'), endDate: new Date('2026-06-25'), reason: 'Bank work and document verification', status: 'pending' },
    ];

    for (const l of leavesData) {
      if (!l.userId) continue;
      await prisma.leaveRequest.create({ data: l });
    }

    console.log('Leave requests created.');
  } else {
    console.log('Leave requests already exist, skipping.');
  }

  // ── Create Additional Notices ──
  const existingNotices = await prisma.notice.count();
  if (existingNotices <= 3) {
    await prisma.notice.createMany({
      data: [
        { authorId: adminUser.id, title: 'Campus Wi-Fi Maintenance', content: 'The campus Wi-Fi network will undergo maintenance this Saturday from 2 AM to 6 AM. Plan accordingly.', targetRole: 'all', priority: 'normal' },
        { authorId: adminUser.id, title: 'Scholarship Applications Open', content: 'Applications for the Merit-cum-Means scholarship are now open. Last date: June 30, 2026. Apply through the student portal.', targetRole: 'student', priority: 'high' },
        { authorId: adminUser.id, title: 'Annual Sports Day', content: 'Annual Sports Day will be held on July 5, 2026. Registration for events opens next week. All students are encouraged to participate.', targetRole: 'all', priority: 'normal' },
        { authorId: adminUser.id, title: 'Lab Session Rescheduling', content: 'DBMS Lab sessions for Section B have been moved to Thursday 2-4 PM starting next week.', targetRole: 'student', priority: 'normal' },
      ],
    });
    console.log('Additional notices created.');
  }

  console.log('Seeding completed successfully!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});

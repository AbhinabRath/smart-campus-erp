// =============================================================================
// Database Seed Script - Creates initial data for the Smart Campus ERP
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'changeme';

const DEPARTMENTS = [
{ code: 'CSE', name: 'Computer Science & Engineering' },
{ code: 'AIDS', name: 'Artificial Intelligence & Data Science' },
{ code: 'ECE', name: 'Electronics & Communication Engineering' },
{ code: 'EEE', name: 'Electrical & Electronics Engineering' },
{ code: 'ME', name: 'Mechanical Engineering' },
{ code: 'CE', name: 'Civil Engineering' },
{ code: 'CHE', name: 'Chemical Engineering' },
{ code: 'BT', name: 'Biotechnology' },
{ code: 'MNC', name: 'Mathematics & Computing' },
{ code: 'AS', name: 'Applied Sciences' },
];

const FIRST_NAMES = [
'Aarav','Vivaan','Aditya','Arjun','Krishna','Rohan','Rahul','Karan',
'Aryan','Vihaan','Abhinav','Harsh','Yash','Shivam','Akash',
'Nikhil','Pranav','Siddharth','Dev','Manav','Ananya','Diya',
'Aisha','Priya','Sneha','Kavya','Meera','Ishita','Riya',
'Pooja','Neha','Nandini','Tanvi','Aditi','Shreya','Muskan',
'Simran','Khushi','Palak','Vaishnavi'
];

const LAST_NAMES = [
'Sharma','Verma','Gupta','Singh','Kumar','Yadav','Patel',
'Mehta','Agarwal','Jain','Reddy','Nair','Iyer','Menon',
'Das','Bose','Chatterjee','Mishra','Pandey','Tiwari',
'Saxena','Kapoor','Bhatia','Malhotra','Joshi',
'Kulkarni','Deshmukh','Chauhan','Thakur','Soni'
];

const QUALIFICATIONS = [
'Ph.D.',
'Ph.D. IIT Delhi',
'Ph.D. IIT Bombay',
'Ph.D. IIT Madras',
'Ph.D. IISc Bangalore',
'M.Tech'
];

const RESEARCH_AREAS = [
'Artificial Intelligence',
'Machine Learning',
'Data Science',
'Cloud Computing',
'Cyber Security',
'Internet of Things',
'Computer Vision',
'Natural Language Processing',
'VLSI Design',
'Signal Processing',
'Power Systems',
'Structural Engineering',
'Thermal Engineering'
];

function randomItem<T>(arr: T[]): T {
return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone() {
return `9${Math.floor(
    100000000 + Math.random() * 900000000
  )}`;
}

function buildSemester(admissionYear: number) {
const now = new Date();

let semester =
(now.getFullYear() - admissionYear) * 2 + 1;

if (now.getMonth() >= 7) {
semester++;
}

return Math.max(1, Math.min(8, semester));
}

function createTeacherRecord(
deptCode: string,
index: number
) {
const first = randomItem(FIRST_NAMES);
const last = randomItem(LAST_NAMES);

return {
name: `${first} ${last}`,
email: `${deptCode.toLowerCase()}.faculty${index}@campus.edu`,
employeeId: `${deptCode}FAC${String(index).padStart(3, '0')}`,
specialization: randomItem(RESEARCH_AREAS),
qualification: randomItem(QUALIFICATIONS),
officeRoom: `${deptCode}-${100 + index}`,
researchArea: randomItem(RESEARCH_AREAS),
phoneNumber: generatePhone(),
};
}

function createStudentRecord(
deptCode: string,
index: number
) {
const first = randomItem(FIRST_NAMES);
const last = randomItem(LAST_NAMES);

const admissionYear =
2023 + Math.floor((index - 1) / 8);

const rollNumber =
`${deptCode}${admissionYear}${String(index).padStart(3, '0')}`;

return {
name: `${first} ${last}`,
email: `${rollNumber.toLowerCase()}@student.campus.edu`,
rollNumber,
admissionYear,
semester: buildSemester(admissionYear),
section: index <= 15 ? 'A' : 'B',
collegeEmail: `${rollNumber.toLowerCase()}@campus.edu`,
phoneNumber: generatePhone(),
guardianName: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
guardianPhone: generatePhone(),
bio: `Student of ${deptCode} interested in academics and campus activities.`,
};
}

async function seed() {
  console.log('Seeding database...');

const passwordHash = await bcrypt.hash(
DEFAULT_PASSWORD,
10
);

// ─────────────────────────────────────
// Departments
// ─────────────────────────────────────

const deptMap: Record<string, any> = {};

for (const dept of DEPARTMENTS) {
const department = await prisma.department.upsert({
where: { code: dept.code },
update: {},
create: {
name: dept.name,
code: dept.code,
},
});

deptMap[dept.code] = department;
}

console.log('Departments created.');

// ─────────────────────────────────────
// Subjects
// ─────────────────────────────────────

const SUBJECTS = [
['DSA', 'Data Structures & Algorithms'],
['DBMS', 'Database Management Systems'],
['OS', 'Operating Systems'],
['CN', 'Computer Networks'],
['OOPS', 'Object Oriented Programming'],
['SE', 'Software Engineering'],
['AI', 'Artificial Intelligence'],
['ML', 'Machine Learning'],
['DAA', 'Design & Analysis of Algorithms'],
['CD', 'Compiler Design'],
];

for (const dept of DEPARTMENTS) {
for (let sem = 1; sem <= 8; sem++) {
for (let i = 0; i < 5; i++) {
const subject = SUBJECTS[i];

  await prisma.subject.upsert({
    where: {
      code: `${dept.code}${sem}${i + 1}`,
    },
    update: {},
    create: {
      name: `${subject[1]} ${sem}`,
      code: `${dept.code}${sem}${i + 1}`,
      departmentId: deptMap[dept.code].id,
      semester: sem,
      credits: i < 3 ? 4 : 3,
      type: i === 4 ? 'lab' : 'theory',
    },
  });
}

}
}

console.log('Subjects created.');

// ─────────────────────────────────────
// Admin
// ─────────────────────────────────────

const adminUser = await prisma.user.upsert({
where: {
email: 'admin@campus.edu',
},
update: {},
create: {
email: 'admin@campus.edu',
password: await bcrypt.hash('admin123', 10),
name: 'Campus Administrator',
role: 'admin',
},
});

console.log('Admin verified.');


  

  // ── Create Teacher Users ──
  const teachers: any[] = [];

let facultyCounter = 1;

for (const dept of DEPARTMENTS) {
for (let i = 1; i <= 5; i++) {
const teacherData = createTeacherRecord(
dept.code,
facultyCounter
);

const user = await prisma.user.upsert({
  where: {
    email: teacherData.email,
  },
  update: {},
  create: {
    email: teacherData.email,
    password: passwordHash,
    name: teacherData.name,
    role: 'teacher',
  },
});

const teacher = await prisma.teacher.upsert({
  where: {
    employeeId: teacherData.employeeId,
  },
  update: {},
  create: {
    userId: user.id,
    employeeId: teacherData.employeeId,
    departmentId: deptMap[dept.code].id,
    specialization:
      teacherData.specialization,
    designation: 'Assistant Professor',
    phoneNumber:
      teacherData.phoneNumber,
    qualification:
      teacherData.qualification,
    officeRoom:
      teacherData.officeRoom,
    researchArea:
      teacherData.researchArea,
    bio: `${teacherData.name} teaches in the ${dept.name} department.`,
  },
});

teachers.push(teacher);

facultyCounter++;

}
}

console.log(
`${teachers.length} teachers created.`
);


  // ── Create Student Users ──
  const students: any[] = [];

let studentCounter = 1;

for (const dept of DEPARTMENTS) {
for (let i = 1; i <= 30; i++) {
const studentData = createStudentRecord(
dept.code,
studentCounter
);

const user = await prisma.user.upsert({
  where: {
    email: studentData.email,
  },
  update: {},
  create: {
    email: studentData.email,
    password: passwordHash,
    name: studentData.name,
    role: 'student',
  },
});

const student = await prisma.student.upsert({
  where: {
    rollNumber: studentData.rollNumber,
  },
  update: {},
  create: {
    userId: user.id,
    rollNumber: studentData.rollNumber,

    departmentId:
      deptMap[dept.code].id,

    semester:
      studentData.semester,

    section:
      studentData.section,

    academicYear:
      `${studentData.admissionYear}-${studentData.admissionYear + 1}`,

    admissionYear:
      studentData.admissionYear,

    collegeEmail:
      studentData.collegeEmail,

    phoneNumber:
      studentData.phoneNumber,

    guardianName:
      studentData.guardianName,

    guardianPhone:
      studentData.guardianPhone,

    bio:
      studentData.bio,
  },
});

students.push(student);

studentCounter++;

}
}

console.log(
`${students.length} students created.`
);

// Reload subjects for later sections

const allSubjects =
await prisma.subject.findMany();

const allTeachers =
await prisma.teacher.findMany();

console.log(
`${allSubjects.length} subjects loaded.`
);


 // ─────────────────────────────────────
// Timetable
// ─────────────────────────────────────

const existingTimetable =
await prisma.timetable.count();

if (existingTimetable === 0) {
for (const dept of DEPARTMENTS) {
const deptSubjects = allSubjects.filter(
s =>
s.departmentId ===
deptMap[dept.code].id
);

const deptTeachers = allTeachers.filter(
  t =>
    t.departmentId ===
    deptMap[dept.code].id
);

for (let day = 1; day <= 5; day++) {
  for (let period = 1; period <= 6; period++) {
    const subject =
      deptSubjects[
        (day + period) %
          deptSubjects.length
      ];

    const teacher =
      deptTeachers[
        (day + period) %
          deptTeachers.length
      ];

    await prisma.timetable.create({
      data: {
        departmentId:
          deptMap[dept.code].id,
        semester: subject.semester,
        section: 'A',
        dayOfWeek: day,
        periodNumber: period,
        subjectId: subject.id,
        teacherId: teacher.id,
        roomNumber:
          `${dept.code}-${100 + period}`,
        startTime: `${8 + period}:00`,
        endTime: `${8 + period}:50`,
      },
    });
  }
}

}
}

console.log('Timetable created.');

// ─────────────────────────────────────
// Notices
// ─────────────────────────────────────

const notices = [
'Mid Semester Examination Schedule Released',
'Placement Training Program Begins',
'Campus Recruitment Drive',
'Technical Symposium Registration Open',
'Research Paper Submission Deadline',
'Library Timing Extended',
'Sports Meet Registration',
'Hackathon Announcement',
'Internship Opportunities Available',
'Industry Expert Guest Lecture'
];

for (const title of notices) {
await prisma.notice.create({
data: {
authorId: adminUser.id,
title,
content:
`${title}. Please check ERP regularly for updates.`,
targetRole: 'all',
priority: 'normal',
},
});
}

console.log('Notices created.');

// ─────────────────────────────────────
// Assignments
// ─────────────────────────────────────

for (const subject of allSubjects) {
const teacher =
allTeachers.find(
t =>
t.departmentId ===
subject.departmentId
);

if (!teacher) continue;

await prisma.assignment.create({
data: {
title:
`${subject.name} Assignment`,
description:
`Assignment for ${subject.name}`,
subjectId: subject.id,
teacherId: teacher.id,
deadline: new Date(
Date.now() +
14 *
24 *
60 *
60 *
1000
),
maxMarks: 25,
},
});
}

console.log('Assignments created.');

// ─────────────────────────────────────
// Study Materials
// ─────────────────────────────────────

for (const subject of allSubjects) {
const teacher =
allTeachers.find(
t =>
t.departmentId ===
subject.departmentId
);

if (!teacher) continue;

await prisma.studyMaterial.create({
data: {
title:
`${subject.name} Notes`,
description:
`Reference notes for ${subject.name}`,
subjectId: subject.id,
teacherId: teacher.id,
fileName:
`${subject.code}.pdf`,
filePath:
`/materials/${subject.code}.pdf`,
fileType: 'pdf',
fileSize: 1024000,
},
});
}

console.log('Study materials created.');

// ─────────────────────────────────────
// Marks
// ─────────────────────────────────────

const assignments =
await prisma.assignment.findMany();

for (const student of students) {
const deptSubjects =
allSubjects.filter(
s =>
s.departmentId ===
student.departmentId
);

for (const subject of deptSubjects.slice(0, 5)) {
const teacher =
allTeachers.find(
t =>
t.departmentId ===
student.departmentId
);

if (!teacher) continue;

await prisma.mark.create({
  data: {
    studentId: student.id,
    subjectId: subject.id,
    teacherId: teacher.id,
    examType: 'internal',
    marksObtained:
      Math.floor(
        Math.random() * 21
      ) + 25,
    totalMarks: 50,
    remarks:
      'Internal Assessment',
  },
});

}
}

console.log('Marks created.');

// ─────────────────────────────────────
// Assignment Submissions
// ─────────────────────────────────────

for (const assignment of assignments) {
const eligibleStudents =
students
.filter(
s =>
s.departmentId ===
(
allSubjects.find(
x =>
x.id ===
assignment.subjectId
)?.departmentId
)
)
.slice(0, 15);

for (const student of eligibleStudents) {
await prisma.assignmentSubmission.create({
data: {
assignmentId:
assignment.id,
studentId:
student.id,
content:
'Assignment submitted.',
status: 'submitted',
},
});
}
}

console.log(
'Assignment submissions created.'
);

// ─────────────────────────────────────
// Leave Requests
// ─────────────────────────────────────

const studentUsers =
await prisma.user.findMany({
where: {
role: 'student',
},
});

for (const user of studentUsers.slice(0, 40)) {
await prisma.leaveRequest.create({
data: {
userId: user.id,
type: 'sick',
startDate: new Date(),
endDate: new Date(
Date.now() +
2 *
24 *
60 *
60 *
1000
),
reason:
'Medical leave request.',
status: 'approved',
approvedBy:
adminUser.id,
comments:
'Approved',
},
});
}

console.log(
'Leave requests created.'
);

console.log('================================');
console.log('SEED COMPLETED');
console.log('================================');

await prisma.$disconnect();
}

seed().catch(async error => {
console.error(error);

await prisma.$disconnect();

process.exit(1);
});

  




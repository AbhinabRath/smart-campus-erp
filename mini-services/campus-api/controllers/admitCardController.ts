import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

function generateAdmitNumber() {
  return Math.floor(
    100000000000 + Math.random() * 900000000000
  ).toString();
}

export async function generateMyAdmitCard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const examType = String(
      req.query.examType || 'internal1'
    );

    const student =
      await prisma.student.findUnique({
        where: {
          userId: req.user!.id,
        },
        include: {
          user: true,
          department: true,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const subjects =
      await prisma.subject.findMany({
        where: {
          departmentId: student.departmentId,
          semester: student.semester,
        },
        orderBy: {
          code: 'asc',
        },
      });

    generatePdf(
      student,
      subjects,
      examType,
      res
    );
  } catch (err) {
    next(err);
  }
}

export async function generateStudentAdmitCard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const examType = String(
      req.query.examType || 'internal1'
    );

    const student =
      await prisma.student.findUnique({
        where: {
          id: req.params.studentId,
        },
        include: {
          user: true,
          department: true,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const subjects =
      await prisma.subject.findMany({
        where: {
          departmentId: student.departmentId,
          semester: student.semester,
        },
        orderBy: {
          code: 'asc',
        },
      });

    generatePdf(
      student,
      subjects,
      examType,
      res
    );
  } catch (err) {
    next(err);
  }
}

function generatePdf(
  student: any,
  subjects: any[],
  examType: string,
  res: Response
) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 30,
  });

  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=AdmitCard.pdf'
  );

  doc.pipe(res);

  const admitNo = generateAdmitNumber();

  // OUTER BORDER
  doc.rect(15, 15, 565, 810).stroke();

  // HEADER
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(
      'SMART CAMPUS ERP',
      0,
      35,
      { align: 'center' }
    );

  doc
    .font('Helvetica')
    .fontSize(13)
    .text(
      'EXAMINATION ADMIT CARD',
      0,
      62,
      { align: 'center' }
    );

  doc
    .fontSize(11)
    .text(
      `EXAMINATION TYPE : ${examType.toUpperCase()}`,
      0,
      84,
      { align: 'center' }
    );

  // STUDENT DETAILS BOX
  doc.rect(30, 120, 330, 150).stroke();

  doc.font('Helvetica-Bold');
  doc.text('Name', 45, 145);
  doc.text('Roll Number', 45, 175);
  doc.text('Department', 45, 205);
  doc.text('Semester', 45, 235);

  doc.font('Helvetica');
  doc.text(`: ${student.user.name}`, 150, 145);
  doc.text(`: ${student.rollNumber}`, 150, 175);
  doc.text(`: ${student.department.name}`, 150, 205);
  doc.text(`: ${student.semester}`, 150, 235);

  // PHOTO BOX
  doc.rect(370, 120, 170, 150).stroke();

  const avatarPath =
    student.user.avatar
      ? path.join(
          process.cwd(),
          student.user.avatar.replace(/^\/+/, '')
        )
      : null;

  if (
    avatarPath &&
    fs.existsSync(avatarPath)
  ) {
    doc.image(
      avatarPath,
      405,
      135,
      {
        fit: [100, 110],
        align: 'center'
      }
    );
  } else {
    doc.rect(
      410,
      135,
      90,
      100
    ).stroke();

    doc.text(
      'PHOTO',
      440,
      180
    );
  }

  doc
    .fontSize(9)
    .text(
      'Photograph of Candidate',
      395,
      245
    );

  // EXAM DETAILS
  doc.rect(30, 290, 510, 75).stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(
      'EXAMINATION DETAILS',
      200,
      302
    );

  doc.font('Helvetica');

  doc.text(
    `Admit Card No. : ${admitNo}`,
    45,
    330
  );

  doc.text(
    `Exam Type : ${examType.toUpperCase()}`,
    270,
    330
  );

  // SUBJECT TABLE
  let y = 390;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(
      'SUBJECTS',
      30,
      y
    );

  y += 25;

  // HEADER ROW
  doc.rect(30, y, 40, 24).stroke();
  doc.rect(70, y, 90, 24).stroke();
  doc.rect(160, y, 230, 24).stroke();
  doc.rect(390, y, 70, 24).stroke();
  doc.rect(460, y, 80, 24).stroke();

  doc.text('Sl', 42, y + 7);
  doc.text('Code', 98, y + 7);
  doc.text('Subject Name', 225, y + 7);
  doc.text('Date', 410, y + 7);
  doc.text('Time', 485, y + 7);

  y += 24;

  // LIMIT TO FIT ONE PAGE
  const displaySubjects = subjects.slice(0, 8);

  displaySubjects.forEach(
    (subject, index) => {

      const rowHeight = 22;

      doc.rect(30, y, 40, rowHeight).stroke();
      doc.rect(70, y, 90, rowHeight).stroke();
      doc.rect(160, y, 230, rowHeight).stroke();
      doc.rect(390, y, 70, rowHeight).stroke();
      doc.rect(460, y, 80, rowHeight).stroke();

      doc.text(
        String(index + 1),
        45,
        y + 5
      );

      // BLANK SUBJECT CODE COLUMN
      doc.text(
        '',
        100,
        y + 5
      );

      doc.text(
        String(subject.name || '')
          .replace(/^\d+\s*/, '')
          .replace(/\s+\d+$/, '')
          .trim(),
        170,
        y + 5,
        {
          width: 210,
        }
      );

      y += rowHeight;
    }
  );

  // SIGNATURES
  y += 15;

  doc.rect(30, y, 240, 55).stroke();
  doc.rect(300, y, 240, 55).stroke();

  doc.moveTo(80, y + 28)
     .lineTo(220, y + 28)
     .stroke();

  doc.moveTo(350, y + 28)
     .lineTo(500, y + 28)
     .stroke();

  doc.text(
    'Candidate Signature',
    95,
    y + 34
  );

  doc.text(
    'Controller of Examinations',
    340,
    y + 34
  );

  // INSTRUCTIONS
  y += 70;

  doc.rect(30, y, 510, 80).stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(
      'INSTRUCTIONS',
      45,
      y + 10
    );

  doc
    .font('Helvetica')
    .fontSize(9)
    .text(
      '1. Carry this admit card and college identity card.',
      45,
      y + 28
    );

  doc.text(
    '2. Reach the examination hall at least 20 minutes before the exam.',
    45
  );

  doc.text(
    '3. Mobile phones and electronic devices are prohibited.',
    45
  );

  doc.text(
    '4. Follow all examination regulations of the institution.',
    45
  );

  doc.end();
}
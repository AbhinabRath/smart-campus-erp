import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export async function generateMyIdCard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

    const student =
      await prisma.student.findUnique({
        where: {
          userId: req.user!.id
        },
        include: {
          user: true,
          department: true
        }
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    generateCard(
      student,
      res
    );

  } catch (err) {
    next(err);
  }
}

function generateCard(
  student: any,
  res: Response
) {

  const doc =
    new PDFDocument({
      size: [300, 500],
      margin: 0
    });

  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=StudentIDCard.pdf'
  );

  doc.pipe(res);

  doc.rect(
    5,
    5,
    290,
    490
  ).stroke();

  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(
      'SMART CAMPUS ERP',
      0,
      20,
      {
        align: 'center'
      }
    );

  doc
    .rect(
      5,
      70,
      290,
      55
    )
    .fill('#0A2A66');

  doc
    .fillColor('white')
    .fontSize(16)
    .text(
      'STUDENT ID CARD',
      0,
      88,
      {
        align: 'center'
      }
    );

  doc.fillColor('black');

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
      95,
      150,
      {
        fit: [110, 130]
      }
    );

  } else {

    doc.rect(
      95,
      150,
      110,
      130
    ).stroke();

    doc.text(
      'PHOTO',
      130,
      210
    );
  }

  doc
    .fontSize(11)
    .font('Helvetica-Bold');

  doc.text(
    'NAME',
    30,
    320
  );

  doc.text(
    'ROLL NO',
    30,
    345
  );

  doc.text(
    'DEPARTMENT',
    30,
    370
  );

  doc.text(
    'SEMESTER',
    30,
    395
  );

  doc.font('Helvetica');

  doc.text(
    `: ${student.user.name}`,
    120,
    320
  );

  doc.text(
    `: ${student.rollNumber}`,
    120,
    345
  );

  doc.text(
    `: ${student.department.name}`,
    120,
    370
  );

  doc.text(
    `: ${student.semester}`,
    120,
    395
  );

  doc
    .rect(
      5,
      450,
      290,
      45
    )
    .fill('#0A2A66');

  doc
    .fillColor('white')
    .fontSize(9)
    .text(
      'Authorized Signature',
      20,
      470
    );

  doc.text(
    'Student Signature',
    180,
    470
  );

  doc.end();
}
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import https from 'https';

export async function generateMyIdCard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

    if (req.user?.role === 'student') {

      const student =
        await prisma.student.findUnique({
          where: {
            userId: req.user.id
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
        {
          ...student,
          cardType: 'student'
        },
        res
      );

      return;
    }

    if (req.user?.role === 'teacher') {

      const teacher =
        await prisma.teacher.findUnique({
          where: {
            userId: req.user.id
          },
          include: {
            user: true,
            department: true
          }
        });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      generateCard(
        {
          ...teacher,
          cardType: 'teacher'
        },
        res
      );

      return;
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });

  } catch (err) {
    next(err);
  }
}

function generateCard(
  user: any,
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
  `attachment; filename=${
    user.cardType === 'teacher'
      ? 'FacultyIDCard.pdf'
      : 'StudentIDCard.pdf'
  }`
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
  user.cardType === 'teacher'
    ? 'FACULTY ID CARD'
    : 'STUDENT ID CARD',
      0,
      88,
      {
        align: 'center'
      }
    );

  doc.fillColor('black');

 if (
  user.user.avatar &&
  user.user.avatar.startsWith('https://')
) {

  https.get(user.user.avatar, (response) => {
    const chunks: Buffer[] = [];

    response.on('data', chunk => chunks.push(chunk));

    response.on('end', () => {
      doc.image(
        Buffer.concat(chunks),
        95,
        150,
        {
          fit: [110, 130]
        }
      );
    });
  });

} else {

  const avatarPath =
    user.user.avatar
      ? path.join(
          process.cwd(),
          user.user.avatar.replace(/^\/+/, '')
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
  user.cardType === 'teacher'
    ? 'EMPLOYEE ID'
    : 'ROLL NO',
  30,
  345
);

  doc.text(
    'DEPARTMENT',
    30,
    370
  );

  doc.text(
  user.cardType === 'teacher'
    ? 'DESIGNATION'
    : 'SEMESTER',
  30,
  395
);

  doc.font('Helvetica');

  doc.text(
    `: ${user.user.name}`,
    120,
    320
  );

  doc.text(
  `: ${
    user.cardType === 'teacher'
      ? user.employeeId || user.id
      : user.rollNumber
  }`,
  120,
  345
);

  doc.text(
    `: ${user.department.name}`,
    120,
    370
  );

  doc.text(
  `: ${
    user.cardType === 'teacher'
      ? (user.designation || 'Faculty')
      : user.semester
  }`,
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
  user.cardType === 'teacher'
    ? 'Faculty Signature'
    : 'Student Signature',
  180,
  470
);

  doc.end();
}
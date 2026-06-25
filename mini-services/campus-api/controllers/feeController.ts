import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';

// =====================================================
// Student Fee Summary
// GET /fees/my
// =====================================================
export async function getMyFees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    const feeStructure = await prisma.fee_structure.findUnique({
      where: {
        semester: student.semester
      }
    });

    if (!feeStructure) {
      return errorResponse(res, 'Fee structure not found', 404);
    }

    const allPayments =
  await prisma.fee_payments.findMany({
    where: {
      studentId: student.id
    }
  });

const feeStructures =
  await prisma.fee_structure.findMany({
    where: {
      semester: {
        lte: student.semester
      }
    },
    orderBy: {
      semester: 'asc'
    }
  });

    
    const ledger = feeStructures.map((fee) => {

  const semesterPayments =
    allPayments.filter(
      (p) =>
        p.semester === fee.semester
    );

  const paidAmount =
    semesterPayments.reduce(
      (sum, p) =>
        sum + Number(p.amountPaid),
      0
    );

  return {
    semester: fee.semester,

    tuitionFee:
      Number(fee.tuitionFee),

    hostelFee:
      Number(fee.hostelFee),

    examFee:
      Number(fee.examFee),

    libraryFee:
      Number(fee.libraryFee),

    miscFee:
      Number(fee.miscFee),

    totalFee:
      Number(fee.totalFee),

    paidAmount,

    balance:
      Number(fee.totalFee) -
      paidAmount
  };
});
let grandTotal = 0;
let grandPaid = 0;
let grandOutstanding = 0;

ledger.forEach((sem) => {

  grandTotal += sem.totalFee;

  grandPaid += sem.paidAmount;

  grandOutstanding += sem.balance;

});
    successResponse(
  res,
  'Fee summary retrieved',
  {
    totalFee: grandTotal,

    paidAmount: grandPaid,

    outstanding: grandOutstanding,

    status:
      grandOutstanding <= 0
        ? 'GREEN'
        : 'RED',

    ledger
  }
);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// Admin Student Ledger
// GET /fees/student/:studentId
// =====================================================
export async function getStudentFees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { studentId } = req.params;

    const student =
      await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: true
        }
      });

    if (!student) {
      return errorResponse(
        res,
        'Student not found',
        404
      );
    }

    const feeStructures =
  await prisma.fee_structure.findMany({
    where: {
      semester: {
        lte: student.semester
      }
    },
    orderBy: {
      semester: 'asc'
    }
  });

    const payments =
      await prisma.fee_payments.findMany({
        where: {
          studentId
        },
        orderBy: {
          paymentDate: 'asc'
        }
      });

    const ledger = feeStructures.map(
      (fee) => {
        const semesterPayments =
          payments.filter(
            (p) =>
              p.semester === fee.semester
          );

        const paidAmount =
          semesterPayments.reduce(
            (sum, p) =>
              sum +
              Number(p.amountPaid),
            0
          );

        const totalFee =
          Number(fee.totalFee);

        return {
          semester: fee.semester,

          tuitionFee:
            Number(fee.tuitionFee),

          hostelFee:
            Number(fee.hostelFee),

          examFee:
            Number(fee.examFee),

          libraryFee:
            Number(fee.libraryFee),

          miscFee:
            Number(fee.miscFee),

          totalFee,

          paidAmount,

          balance:
            totalFee -
            paidAmount
        };
      }
    );

    successResponse(
      res,
      'Ledger retrieved',
      {
        student,
        ledger
      }
    );
  } catch (err) {
    next(err);
  }
}

// =====================================================
// Admin Student List
// GET /fees/admin/list
// =====================================================
export async function getFeeAdminList(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const students =
      await prisma.student.findMany({
        include: {
          user: true
        }
      });

    const result: any[] = [];

    for (const student of students) {
        const feeStructures =
  await prisma.fee_structure.findMany({
    where: {
      semester: {
        lte: student.semester
      }
    }
  });

const payments =
  await prisma.fee_payments.findMany({
    where: {
      studentId: student.id
    }
  });

let totalFee = 0;
let paidAmount = 0;

for (const fee of feeStructures) {

  totalFee += Number(fee.totalFee);

  const semesterPaid =
    payments
      .filter(
        p =>
          p.semester === fee.semester
      )
      .reduce(
        (sum, p) =>
          sum +
          Number(p.amountPaid),
        0
      );

  paidAmount += semesterPaid;
}

const balance =
  totalFee - paidAmount;

result.push({
  id: student.id,

  name:
    student.user.name,

  rollNumber:
    student.rollNumber,

  semester:
    student.semester,

  totalFee,

  paidAmount,

  balance,

  status:
    balance <= 0
      ? 'GREEN'
      : 'RED'
});
    }

    successResponse(
      res,
      'Fee list retrieved',
      result
    );
  } catch (err) {
    next(err);
  }
}

// =====================================================
// Admin Add Payment
// POST /fees/payment
// =====================================================
export async function addPayment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      studentId,
      semester,
      amountPaid,
      remarks
    } = req.body;

    const student =
      await prisma.student.findUnique({
        where: {
          id: studentId
        }
      });

    if (!student) {
      return errorResponse(
        res,
        'Student not found',
        404
      );
    }

    if (
      semester >
      student.semester
    ) {
      return errorResponse(
        res,
        'Cannot add payment for future semester',
        400
      );
    }
    
     const structure =
  await prisma.fee_structure.findUnique({
    where: { semester }
  });

if (!structure) {
  return errorResponse(
    res,
    'Fee structure not found',
    404
  );
}

const existingPayments =
  await prisma.fee_payments.findMany({
    where: {
      studentId,
      semester
    }
  });

const alreadyPaid =
  existingPayments.reduce(
    (sum, p) =>
      sum + Number(p.amountPaid),
    0
  );

const totalFee =
  Number(structure.totalFee);

if (
  alreadyPaid + Number(amountPaid)
  > totalFee
) {
  return errorResponse(
    res,
    'Payment exceeds total fee',
    400
  );
}
if (
  Number(amountPaid) <= 0
) {
  return errorResponse(
    res,
    'Invalid amount',
    400
  );
}

    const payment =
      await prisma.fee_payments.create({
        data: {
          id:
            'pay_' +
            Date.now(),

          studentId,

          semester,

          amountPaid,

          remarks
        }
      });

    successResponse(
      res,
      'Payment added successfully',
      payment
    );
  } catch (err) {
    next(err);
  }
}
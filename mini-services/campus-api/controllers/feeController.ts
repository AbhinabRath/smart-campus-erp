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

    const paymentTotals =
  await prisma.fee_payments.groupBy({
    by: ['semester'],
    where: {
      studentId: student.id,
    },
    _sum: {
      amountPaid: true,
    },
  });

const feeStructures =
  await prisma.fee_structure.findMany({
    where: {
      semester: {
        lte: student.semester,
      },
    },
    orderBy: {
      semester: 'asc',
    },
  });

const paidBySemester = new Map(
  paymentTotals.map((p) => [
    p.semester,
    Number(p._sum.amountPaid || 0),
  ])
);

const ledger = feeStructures.map((fee) => {

  const paidAmount =
    paidBySemester.get(fee.semester) || 0;

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

    const paymentTotals =
  await prisma.fee_payments.groupBy({
    by: ['semester'],
    where: {
      studentId,
    },
    _sum: {
      amountPaid: true,
    },
  });

const paidBySemester = new Map(
  paymentTotals.map((p) => [
    p.semester,
    Number(p._sum.amountPaid || 0),
  ])
);

const ledger = feeStructures.map((fee) => {

  const paidAmount =
    paidBySemester.get(fee.semester) || 0;

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
export async function getFeeAdminList(req: Request, res: Response, next: NextFunction) {
  try {
    // Single query: all students with user info
    const students = await prisma.student.findMany({
      select: {
        id: true,
        rollNumber: true,
        semester: true,
        user: { select: { name: true } },
      },
    });

    // Single query: ALL fee structures (small table, safe to load entirely)
    const allFeeStructures = await prisma.fee_structure.findMany({
      orderBy: { semester: 'asc' },
    });

    // Single grouped query: ALL payment totals by student and semester
const allPayments =
  await prisma.fee_payments.groupBy({
    by: ['studentId', 'semester'],
    _sum: {
      amountPaid: true,
    },
  });

    // Build O(1) lookup structures once, outside any per-student loop
    // Map: semester -> totalFee (number)
    const feeBySemester = new Map<number, number>();
    for (const fee of allFeeStructures) {
      feeBySemester.set(fee.semester, Number(fee.totalFee));
    }

    // Map: studentId -> Map<semester, paidAmount>
    const paymentsByStudent = new Map<string, Map<number, number>>();
    for (const p of allPayments) {
      let semMap = paymentsByStudent.get(p.studentId);
      if (!semMap) {
        semMap = new Map();
        paymentsByStudent.set(p.studentId, semMap);
      }
      semMap.set(
  p.semester,
  Number(p._sum.amountPaid || 0)
);
    }

    // Precompute cumulative totalFee for each semester level (1..N)
    // so we don't re-sum fee structures for every student
    const semesters = [...feeBySemester.keys()].sort((a, b) => a - b);
    const cumulativeFeeBySemester = new Map<number, number>();
    let running = 0;
    for (const sem of semesters) {
      running += feeBySemester.get(sem)!;
      cumulativeFeeBySemester.set(sem, running);
    }

    const result: any[] = students.map((student) => {
      // totalFee = sum of fee_structure.totalFee for semester <= student.semester
      // Use the precomputed cumulative map, finding the largest semester <= student.semester
      let totalFee = 0;
      for (const sem of semesters) {
        if (sem > student.semester) break;
        totalFee = cumulativeFeeBySemester.get(sem)!;
      }

      const studentPayments = paymentsByStudent.get(student.id);
      let paidAmount = 0;
      if (studentPayments) {
        for (const sem of semesters) {
          if (sem > student.semester) break;
          paidAmount += studentPayments.get(sem) || 0;
        }
      }

      const balance = totalFee - paidAmount;

      return {
        id: student.id,
        name: student.user.name,
        rollNumber: student.rollNumber,
        semester: student.semester,
        totalFee,
        paidAmount,
        balance,
        status: balance <= 0 ? 'GREEN' : 'RED',
      };
    });

    successResponse(res, 'Fee list retrieved', result);
  } catch (err) { next(err); }
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
  await prisma.fee_payments.aggregate({
    where: {
      studentId,
      semester,
    },
    _sum: {
      amountPaid: true,
    },
  });

const alreadyPaid =
  Number(existingPayments._sum.amountPaid || 0);

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
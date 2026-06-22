import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import path from 'path';
import fs from 'fs';
const getRealFilePath = (storedPath: string) => {

  const filename =
    path.basename(storedPath);

  return path.join(
    process.cwd(),
    'uploads',
    filename
  );

};
// =====================================================
// SYLLABUS & CURRICULUM
// =====================================================

export async function getAcademicDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const docs =
      await prisma.academicDocument.findMany({
        orderBy: [
          { year: 'asc' },
          { type: 'asc' }
        ]
      });

    successResponse(
      res,
      'Academic documents retrieved.',
      docs
    );

  } catch (err) {
    next(err);
  }
}

// =====================================================
// ACADEMIC CALENDAR
// =====================================================

export async function getAcademicCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const calendar =
      await prisma.academicCalendar.findFirst({
        orderBy: {
          createdAt: 'desc'
        }
      });

    successResponse(
      res,
      'Academic calendar retrieved.',
      calendar
    );

  } catch (err) {
    next(err);
  }
}

// =====================================================
// REGULATIONS
// =====================================================

export async function getRegulation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const regulation =
      await prisma.regulationDocument.findFirst({
        orderBy: {
          createdAt: 'desc'
        }
      });

    successResponse(
      res,
      'Regulation retrieved.',
      regulation
    );

  } catch (err) {
    next(err);
  }
}
// =====================================================
// UPLOAD ACADEMIC DOCUMENT
// =====================================================

export async function uploadAcademicDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const {
      year,
      type
    } = req.body;
console.log('BODY:', req.body);
console.log('FILE:', req.file);

    if (!req.file) {
      errorResponse(
        res,
        'PDF file required.',
        400
      );
      return;
    }

    const existing =
      await prisma.academicDocument.findFirst({
        where: {
          year: Number(year),
          type
        }
      });

    if (existing) {

      if (
        fs.existsSync(
          existing.filePath
        )
      ) {
        fs.unlinkSync(
          existing.filePath
        );
      }

      await prisma.academicDocument.delete({
        where: {
          id: existing.id
        }
      });
    }

    const doc =
      await prisma.academicDocument.create({
        data: {
          year: Number(year),
          type,
          fileName:
            req.file.originalname,
          filePath: `/uploads/${req.file.filename}`,
          
            uploadedBy: req.user!.id
        }
      });

    successResponse(
      res,
      'Document uploaded.',
      doc
    );

  } catch (err) {
    next(err);
  }
}

// =====================================================
// DELETE ACADEMIC DOCUMENT
// =====================================================

export async function deleteAcademicDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { id } = req.params;

    const doc =
      await prisma.academicDocument.findUnique({
        where: { id }
      });

    if (!doc) {

      errorResponse(
        res,
        'Document not found.',
        404
      );

      return;
    }

    const filePath =
  getRealFilePath(
    doc.filePath
  );

if (
  fs.existsSync(
    filePath
  )
) {
  fs.unlinkSync(
    filePath
  );
}

    await prisma.academicDocument.delete({
      where: { id }
    });

    successResponse(
      res,
      'Document deleted.'
    );

  } catch (err) {
    next(err);
  }
}

// =====================================================
// UPLOAD CALENDAR
// =====================================================

export async function uploadCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    if (!req.file) {

      errorResponse(
        res,
        'PDF required.',
        400
      );

      return;
    }

    const old =
      await prisma.academicCalendar.findFirst();

    if (old) {

      if (
        fs.existsSync(
          old.filePath
        )
      ) {
        fs.unlinkSync(
          old.filePath
        );
      }

      await prisma.academicCalendar.delete({
        where: {
          id: old.id
        }
      });
    }

    const calendar =
      await prisma.academicCalendar.create({
        data: {
          fileName:
            req.file.originalname,
          filePath: `/uploads/${req.file.filename}`,
           
            uploadedBy: req.user!.id
        }
      });

    successResponse(
      res,
      'Calendar uploaded.',
      calendar
    );

  } catch (err) {
    next(err);
  }
}

// =====================================================
// DELETE CALENDAR
// =====================================================

export async function deleteCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { id } = req.params;

    const calendar =
      await prisma.academicCalendar.findUnique({
        where: { id }
      });

    if (!calendar) {

      errorResponse(
        res,
        'Calendar not found.',
        404
      );

      return;
    }

   const filePath =
  getRealFilePath(
    calendar.filePath
  );

if (
  fs.existsSync(
    filePath
  )
) {
  fs.unlinkSync(
    filePath
  );
}

    await prisma.academicCalendar.delete({
      where: { id }
    });

    successResponse(
      res,
      'Calendar deleted.'
    );

  } catch (err) {
    next(err);
  }
}

// =====================================================
// UPLOAD REGULATION
// =====================================================

export async function uploadRegulation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    if (!req.file) {

      errorResponse(
        res,
        'PDF required.',
        400
      );

      return;
    }

    const old =
      await prisma.regulationDocument.findFirst();

    if (old) {

      if (
        fs.existsSync(
          old.filePath
        )
      ) {
        fs.unlinkSync(
          old.filePath
        );
      }

      await prisma.regulationDocument.delete({
        where: {
          id: old.id
        }
      });
    }

    const regulation =
      await prisma.regulationDocument.create({
        data: {
          fileName:
            req.file.originalname,
          filePath: `/uploads/${req.file.filename}`,
            
            uploadedBy: req.user!.id
        }
      });

    successResponse(
      res,
      'Regulation uploaded.',
      regulation
    );

  } catch (err) {
    next(err);
  }
}

// =====================================================
// DELETE REGULATION
// =====================================================

export async function deleteRegulation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { id } = req.params;

    const regulation =
      await prisma.regulationDocument.findUnique({
        where: { id }
      });

    if (!regulation) {

      errorResponse(
        res,
        'Regulation not found.',
        404
      );

      return;
    }

    const filePath =
  getRealFilePath(
    regulation.filePath
  );

if (
  fs.existsSync(
    filePath
  )
) {
  fs.unlinkSync(
    filePath
  );
}

    await prisma.regulationDocument.delete({
      where: { id }
    });

    successResponse(
      res,
      'Regulation deleted.'
    );

  } catch (err) {
    next(err);
  }
}
export async function downloadAcademicDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { id } = req.params;

    const doc =
      await prisma.academicDocument.findUnique({
        where: { id }
      });

    if (!doc) {

      errorResponse(
        res,
        'Document not found.',
        404
      );

      return;
    }

    const filePath =
  getRealFilePath(
    doc.filePath
  );

res.download(
  filePath,
  doc.fileName
);

  } catch (err) {

    next(err);

  }

}
export async function downloadCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { id } = req.params;

    const calendar =
      await prisma.academicCalendar.findUnique({
        where: { id }
      });

    if (!calendar) {

      errorResponse(
        res,
        'Calendar not found.',
        404
      );

      return;
    }

    const filePath =
  getRealFilePath(
    calendar.filePath
  );

res.download(
  filePath,
  calendar.fileName
);

  } catch (err) {

    next(err);

  }

}
export async function downloadRegulation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {

  try {

    const { id } = req.params;

    const regulation =
      await prisma.regulationDocument.findUnique({
        where: { id }
      });

    if (!regulation) {

      errorResponse(
        res,
        'Regulation not found.',
        404
      );

      return;
    }

    const filePath =
  getRealFilePath(
    regulation.filePath
  );

res.download(
    filePath,
    regulation.fileName
);

  } catch (err) {

    next(err);

  }

}
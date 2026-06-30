// =============================================================================
// Study Material Controller - Educational Resource Management
// =============================================================================
// Handles CRUD operations for study materials (PDFs, PPTs, DOCs, etc.)
// uploaded by teachers. Includes file upload, download with counter tracking,
// and search/filter functionality.
//
// The download counter helps teachers understand which materials are most
// accessed by students, informing future resource creation decisions.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { Readable } from "stream";
import cloudinary from "../config/cloudinary";
/**
 * POST /api/materials
 * Teacher uploads a new study material with file attachment.
 */
export async function createMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, title, description } = req.body;
    const userId = req.user!.id;

    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) {
      errorResponse(res, 'Teacher profile not found.', 404);
      return;
    }

    // File is required for study materials (they are file-based resources)
    if (!req.file) {
      errorResponse(res, 'File is required for study material.', 400);
      return;
    }
const result: any = await new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
  folder: "uploads/study-materials",
  resource_type: "auto",
  use_filename: true,
  unique_filename: true,
  filename_override: req.file!.originalname,
},
    (error, uploadResult) => {
      if (error) return reject(error);
      resolve(uploadResult);
    }
  );

  Readable.from(req.file!.buffer).pipe(stream);
});
    // Determine file type from extension for filtering/search purposes
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    const material = await prisma.studyMaterial.create({
      data: {
        teacherId: teacher.id,
        subjectId,
        title,
        description: description || null,
        filePath: result.secure_url,
        fileName: req.file.originalname,
        fileType: ext,
        fileSize: req.file.size,
      },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    });

    successResponse(res, 'Study material uploaded successfully.', material, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/materials
 * List study materials with optional filters.
 * Supports filtering by subject, file type, and text search.
 */
export async function getMaterials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, fileType, search } = req.query;

    const where: any = {};
    if (subjectId) where.subjectId = String(subjectId);
    if (fileType) where.fileType = String(fileType);

    // Text search across title and description
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const materials = await prisma.studyMaterial.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, 'Study materials retrieved.', materials);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/materials/:id
 * Get details of a specific study material.
 */
export async function getMaterialById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const material = await prisma.studyMaterial.findUnique({
      where: { id },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!material) {
      errorResponse(res, 'Study material not found.', 404);
      return;
    }

    successResponse(res, 'Study material retrieved.', material);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/materials/:id/download
 * Download the study material file. Increments the download counter
 * so teachers can track which resources are most accessed.
 */
export async function downloadMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const material = await prisma.studyMaterial.findUnique({ where: { id } });
    if (!material) {
      errorResponse(res, 'Study material not found.', 404);
      return;
    }

    // Check if the file actually exists on disk
    if (!fs.existsSync(material.filePath)) {
      errorResponse(res, 'File not found on server.', 404);
      return;
    }

    // Increment download counter atomically
    await prisma.studyMaterial.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });

    // Send the file to the client with the original filename
    res.download(material.filePath, material.fileName);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/materials/:id
 * Teacher deletes a study material (also removes the file from disk).
 */
export async function deleteMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const material = await prisma.studyMaterial.findUnique({ where: { id } });
    if (!material) {
      errorResponse(res, 'Study material not found.', 404);
      return;
    }

    // Remove the file from disk to free up storage
    if (fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath);
    }

    await prisma.studyMaterial.delete({ where: { id } });
    successResponse(res, 'Study material deleted successfully.');
  } catch (err) {
    next(err);
  }
}

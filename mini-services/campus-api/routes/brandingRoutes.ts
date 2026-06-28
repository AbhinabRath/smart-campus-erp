import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from "uuid";

import {
  requireAuth,
  requireRole
} from '../middleware/auth';

import {
  getBranding,
  uploadBackground
} from '../controllers/brandingController';

const router = Router();

const brandingDir =
  path.join(
    __dirname,
    '..',
    'uploads',
    'branding'
  );

if (!fs.existsSync(brandingDir)) {
  fs.mkdirSync(
    brandingDir,
    { recursive: true }
  );
}

import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const storage =
  process.env.NODE_ENV === "production"
    ? new CloudinaryStorage({
        cloudinary,
        params: async (_req, file) => ({
          folder: "uploads/branding",
          public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
          resource_type: "image",
        }),
      })
    : multer.diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, brandingDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}-${file.originalname}`);
        },
      });

const upload =
  multer({
    storage
  });

router.get(
  '/',
  getBranding
);

router.post(
  '/background',
  requireAuth,
  requireRole('admin'),
  upload.single('file'),
  uploadBackground
);

export default router;
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        brandingDir
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const ext =
        path.extname(
          file.originalname
        );

      cb(
        null,
        `login-bg-${Date.now()}${ext}`
      );
    }
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
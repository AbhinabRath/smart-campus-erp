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
const storage = multer.memoryStorage();

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
  (req, res, next) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        console.dir(err, { depth: null });

if ((err as any).storageErrors) {
  console.dir((err as any).storageErrors, { depth: null });
}

if ((err as any).cause) {
  console.dir((err as any).cause, { depth: null });
}

if ((err as any).error) {
  console.dir((err as any).error, { depth: null });
}
        return res.status(500).json(err);
      }
      next();
    });
  },
  uploadBackground
);

export default router;
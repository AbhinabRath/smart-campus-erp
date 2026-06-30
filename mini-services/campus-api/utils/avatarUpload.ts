import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';


const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');

if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

import cloudinary from "../config/cloudinary";


const storage = multer.memoryStorage();

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP images are allowed.'));
    }
  },
});
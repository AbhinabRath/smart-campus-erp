// =============================================================================
// File Upload Configuration (Multer)
// =============================================================================
// Configures multer for handling file uploads in the campus ERP system.
// - Restricts file types to academic document formats (PDF, PPT, DOCX, etc.)
//   to prevent malicious file uploads.
// - Limits file size to 10MB to prevent abuse and server overload.
// - Stores files in the uploads/ directory with unique names to avoid conflicts.
// =============================================================================

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Ensure uploads directory exists at server startup
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration: files are saved with a unique UUID prefix
// to prevent name collisions when multiple users upload files with same names.
import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const storage =
process.env.NODE_ENV === "production"
? new CloudinaryStorage({
    cloudinary,
    params: (_req, file) => ({
  folder: "uploads",
  resource_type: "auto",
  public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
})
  })
: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}-${file.originalname}`);
    },
  });

// File filter: only allow academic document types.
// This prevents executable or script files from being uploaded, which could
// be a security risk if served back to users.
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, PPT, PPTX, DOC, and DOCX files are allowed.'));
  }
};

// Max file size: 10MB — large enough for academic documents but prevents abuse
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

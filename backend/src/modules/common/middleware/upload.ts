import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { createError } from './errorHandler';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(createError(`Only Excel files are allowed (.xlsx, .xls, .csv)`, 400));
  }

  cb(null, true);
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

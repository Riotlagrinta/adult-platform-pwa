import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureUploadDir } from '../lib/storage.js';

function safeBaseName(originalName: string) {
  const parsed = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '-');
  return parsed.slice(0, 40) || 'file';
}

function buildStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, ensureUploadDir(subdir));
    },
    filename: (_req, file, cb) => {
      const unique = crypto.randomUUID();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${safeBaseName(file.originalname)}-${unique}${ext}`);
    },
  });
}

export function createUploader(subdir: string, allowedMimeTypes: string[]) {
  return multer({
    storage: buildStorage(subdir),
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      const cleanMime = file.mimetype.split(';')[0].trim().toLowerCase();
      const rawMime = file.mimetype.trim().toLowerCase();

      const isAllowed =
        allowedMimeTypes.includes(cleanMime) ||
        allowedMimeTypes.includes(rawMime) ||
        (allowedMimeTypes.some((t) => t.startsWith('audio/')) && cleanMime.startsWith('audio/')) ||
        (allowedMimeTypes.some((t) => t.startsWith('video/')) && cleanMime.startsWith('video/')) ||
        (allowedMimeTypes.some((t) => t.startsWith('image/')) && cleanMime.startsWith('image/'));

      if (!isAllowed) {
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
        return;
      }

      cb(null, true);
    },
  });
}


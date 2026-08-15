import path from 'node:path';
import fs from 'node:fs';

export const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });

export function ensureUploadDir(subdir: string) {
  const fullPath = path.join(uploadRoot, subdir);
  fs.mkdirSync(fullPath, { recursive: true });
  return fullPath;
}

export function publicUploadUrl(filename: string) {
  return `/uploads/${filename.replace(/\\/g, '/')}`;
}

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './prisma.js';
import { uploadRoot } from './storage.js';

export type MediaInput = {
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  mimeType: string;
  durationSeconds?: number;
  allowDownload?: boolean;
  expiresAt?: string;
};

export function isLocalUploadUrl(url: string) {
  return url.startsWith('/uploads/');
}

export function resolveUploadPath(url: string) {
  if (!isLocalUploadUrl(url)) {
    return null;
  }

  const relativePath = url.replace('/uploads/', '');
  const absolutePath = path.resolve(uploadRoot, relativePath);
  if (!absolutePath.startsWith(uploadRoot)) {
    return null;
  }

  return absolutePath;
}

export async function deleteMediaFile(url: string) {
  const absolutePath = resolveUploadPath(url);
  if (!absolutePath) {
    return;
  }

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

export async function cleanupExpiredMedia() {
  const expiredMedia = await prisma.media.findMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      url: true,
    },
  });

  for (const media of expiredMedia) {
    await deleteMediaFile(media.url);
  }

  if (expiredMedia.length > 0) {
    await prisma.media.deleteMany({
      where: {
        id: {
          in: expiredMedia.map((media) => media.id),
        },
      },
    });
  }
}


import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './prisma.js';
import { uploadRoot } from './storage.js';
import { isS3Enabled, deleteFromS3, extractStorageKey } from './storage-online.js';

export type MediaInput = {
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
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
  if (absolutePath && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }

  // Le fichier peut aussi (ou uniquement) exister sur le stockage S3/B2 : sans ça,
  // les médias éphémères supprimés en base restaient stockés indéfiniment sur Backblaze.
  if (isS3Enabled()) {
    const key = extractStorageKey(url);
    if (key) {
      await deleteFromS3(key);
    }
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


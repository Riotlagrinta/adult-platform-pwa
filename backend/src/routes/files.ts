import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { createUploader } from '../middleware/upload.js';
import { publicUploadUrl } from '../lib/storage.js';

export const filesRouter = Router();

const avatarUpload = createUploader('avatars', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const mediaUpload = createUploader('media', ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const verificationUpload = createUploader('verification', ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

filesRouter.post('/avatar', requireAuth, avatarUpload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const url = publicUploadUrl(`avatars/${path.basename(file.path)}`);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    });

    res.status(201).json({
      file: {
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      user,
    });
  } catch (error) {
    next(error);
  }
});

filesRouter.post('/media', requireAuth, requireApproved, mediaUpload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const url = publicUploadUrl(`media/${path.basename(file.path)}`);
    res.status(201).json({
      file: {
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

filesRouter.post('/verification', requireAuth, verificationUpload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const url = publicUploadUrl(`verification/${path.basename(file.path)}`);
    res.status(201).json({
      file: {
        url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

filesRouter.delete('/delete', requireAuth, async (req, res, next) => {
  try {
    const filePath = typeof req.query.path === 'string' ? req.query.path : '';
    if (!filePath.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const relativePath = filePath.replace('/uploads/', '');
    const absolutePath = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads', relativePath);
    const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

    if (!absolutePath.startsWith(uploadRoot)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // ── Vérification d'autorisation (Anti-IDOR) & Nettoyage de la base de données ──
    const userRole = req.user!.role;
    const userId = req.user!.id;
    const isUserAdmin = userRole === 'ADMIN';

    if (filePath.startsWith('/uploads/avatars/')) {
      // Pour les avatars : l'utilisateur doit être le propriétaire ou un ADMIN
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });
      const isOwner = dbUser?.avatarUrl === filePath;

      if (!isOwner && !isUserAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Nettoyer avatarUrl en base de données
      await prisma.user.updateMany({
        where: { avatarUrl: filePath },
        data: { avatarUrl: null },
      });
    } else if (filePath.startsWith('/uploads/media/')) {
      // Pour les médias : l'utilisateur doit être l'auteur du post ou l'expéditeur du message
      const mediaItem = await prisma.media.findFirst({
        where: { url: filePath },
        include: {
          post: { select: { authorId: true } },
          message: { select: { senderId: true } },
        },
      });

      if (mediaItem) {
        const isOwner =
          mediaItem.post?.authorId === userId || mediaItem.message?.senderId === userId;

        if (!isOwner && !isUserAdmin) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        // Supprimer l'enregistrement Media
        await prisma.media.delete({
          where: { id: mediaItem.id },
        });
      } else {
        // Si le média n'est plus en base de données, seuls les admins peuvent le supprimer physiquement
        if (!isUserAdmin) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    } else if (filePath.startsWith('/uploads/verification/')) {
      // Pour les justificatifs de vérification : l'utilisateur doit être le propriétaire ou un ADMIN
      const verificationRequest = await prisma.verificationRequest.findFirst({
        where: {
          notes: {
            contains: filePath,
          },
        },
      });

      if (verificationRequest) {
        const isOwner = verificationRequest.userId === userId;

        if (!isOwner && !isUserAdmin) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        // Nettoyer la référence du fichier dans le champ notes
        const updatedNotes = verificationRequest.notes
          ? verificationRequest.notes.replace(new RegExp(`\\n?Pièce:\\s*${filePath}`, 'g'), '')
          : null;

        await prisma.verificationRequest.update({
          where: { id: verificationRequest.id },
          data: { notes: updatedNotes },
        });
      } else {
        // Si aucune demande n'y fait référence, seuls les admins peuvent le supprimer physiquement
        if (!isUserAdmin) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    } else {
      // Pour tout autre dossier sous /uploads/
      if (!isUserAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});


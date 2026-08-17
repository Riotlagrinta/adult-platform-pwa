import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { createUploader } from '../middleware/upload.js';
import { publicUploadUrl } from '../lib/storage.js';
import {
  isS3Enabled,
  uploadToS3,
  signUrlIfNeeded,
} from '../lib/storage-online.js';

export const storiesRouter = Router();

const storyUpload = createUploader('stories', ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);

// Créer une story avec réglage de durée (6h, 12h, 24h, 48h) et de visibilité
storiesRouter.post('/', requireAuth, requireApproved, storyUpload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    let url = publicUploadUrl(`stories/${path.basename(file.path)}`);

    if (isS3Enabled()) {
      try {
        const key = `stories/${path.basename(file.path)}`;
        url = await uploadToS3(file.path, key, file.mimetype);
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (s3Error) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw s3Error;
      }
    }

    // 1. Calcul de la durée d'expiration personnalisée (6h, 12h, 24h ou 48h)
    const allowedDurations = [6, 12, 24, 48];
    const durationHours = allowedDurations.includes(Number(req.body.durationHours))
      ? Number(req.body.durationHours)
      : 24;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // 2. Visibilité contrôlée (PUBLIC, FOLLOWERS, VERIFIED_ONLY)
    const allowedVisibilities = ['PUBLIC', 'FOLLOWERS', 'VERIFIED_ONLY'];
    const visibility = allowedVisibilities.includes(req.body.visibility)
      ? (req.body.visibility as 'PUBLIC' | 'FOLLOWERS' | 'VERIFIED_ONLY')
      : 'FOLLOWERS';

    const caption = typeof req.body.caption === 'string' && req.body.caption.trim().length > 0
      ? req.body.caption.trim()
      : undefined;

    const story = await prisma.story.create({
      data: {
        authorId: req.user!.id,
        mediaUrl: url,
        mimeType: file.mimetype,
        caption,
        visibility,
        expiresAt,
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    const signedUrl = await signUrlIfNeeded(url);
    const signedStory = {
      ...story,
      mediaUrl: signedUrl || url,
    };

    res.status(201).json({ story: signedStory });
  } catch (error) {
    next(error);
  }
});

// Récupérer toutes les stories actives selon la visibilité
storiesRouter.get('/', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const now = new Date();

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true },
    });

    // 1. Récupérer les ID des utilisateurs suivis
    const following = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      select: { followingId: true },
    });
    const followingIds = new Set(following.map((f: { followingId: string }) => f.followingId));

    // 2. Récupérer toutes les stories actives non expirées
    const stories = await prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            verificationStatus: true,
          },
        },
      },
    });

    // 3. Filtrer selon la visibilité choisie par chaque auteur
    const visibleStories = stories.filter((s) => {
      // Mes propres stories sont toujours visibles pour moi
      if (s.authorId === req.user!.id) return true;

      // Stories publiques visibles par tous
      if (s.visibility === 'PUBLIC') return true;

      // Stories abonnés : visibles si je suis l'auteur
      if (s.visibility === 'FOLLOWERS') return followingIds.has(s.authorId);

      // Stories vérifiés : visibles uniquement si l'utilisateur connecté est APPROVED
      if (s.visibility === 'VERIFIED_ONLY') {
        return currentUser?.verificationStatus === 'APPROVED';
      }

      return false;
    });

    // 4. Pré-signer les URLs des stories
    const signedStories = await Promise.all(
      visibleStories.map(async (s) => ({
        ...s,
        mediaUrl: (await signUrlIfNeeded(s.mediaUrl)) || s.mediaUrl,
        author: {
          ...s.author,
          avatarUrl: (await signUrlIfNeeded(s.author.avatarUrl)) || s.author.avatarUrl,
        },
      }))
    );

    // 5. Grouper les stories par utilisateur
    const groupsMap = new Map<string, { userId: string; displayName: string; avatarUrl: string | null; verificationStatus: string; items: typeof signedStories }>();

    if (currentUser) {
      const signedAvatar = await signUrlIfNeeded(currentUser.avatarUrl);
      groupsMap.set(currentUser.id, {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        avatarUrl: signedAvatar || currentUser.avatarUrl,
        verificationStatus: currentUser.verificationStatus,
        items: [],
      });
    }

    signedStories.forEach((s) => {
      const group = groupsMap.get(s.authorId);
      if (group) {
        group.items.push(s);
      } else {
        groupsMap.set(s.authorId, {
          userId: s.author.id,
          displayName: s.author.displayName,
          avatarUrl: s.author.avatarUrl,
          verificationStatus: s.author.verificationStatus,
          items: [s],
        });
      }
    });

    // Mettre l'utilisateur connecté en première position du carrousel
    const groups = Array.from(groupsMap.values());
    const sortedGroups = groups.sort((a, b) => {
      if (a.userId === req.user!.id) return -1;
      if (b.userId === req.user!.id) return 1;
      return 0;
    });

    res.json({ stories: sortedGroups });
  } catch (error) {
    next(error);
  }
});

// Supprimer une story (par l'auteur ou un admin)
storiesRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const storyId = String(req.params.id);
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return res.status(404).json({ error: 'Story non trouvée' });
    }

    if (story.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    res.json({ ok: true, message: 'Story supprimée avec succès' });
  } catch (error) {
    next(error);
  }
});

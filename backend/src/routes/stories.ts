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

// Créer une story
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

    // Expiration après 24 heures
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        authorId: req.user!.id,
        mediaUrl: url,
        mimeType: file.mimetype,
        caption: typeof req.body.caption === 'string' ? req.body.caption : undefined,
        expiresAt,
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } }
      }
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

// Récupérer toutes les stories actives (24h)
storiesRouter.get('/', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Récupérer les ID des utilisateurs suivis
    const following = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      select: { followingId: true },
    });
    const followingIds = following.map((f: { followingId: string }) => f.followingId);

    // Inclure soi-même dans le flux de stories
    const userIds = [...followingIds, req.user!.id];

    // 2. Récupérer les stories actives de ces utilisateurs
    const stories = await prisma.story.findMany({
      where: {
        authorId: { in: userIds },
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

    // 3. Pré-signer les URLs des stories
    const signedStories = await Promise.all(
      stories.map(async (s) => ({
        ...s,
        mediaUrl: (await signUrlIfNeeded(s.mediaUrl)) || s.mediaUrl,
        author: {
          ...s.author,
          avatarUrl: (await signUrlIfNeeded(s.author.avatarUrl)) || s.author.avatarUrl,
        }
      }))
    );

    // 4. Grouper les stories par utilisateur
    const groupsMap = new Map<string, { userId: string; displayName: string; avatarUrl: string | null; verificationStatus: string; items: typeof signedStories }>();

    // Initialiser le groupe de l'utilisateur en cours s'il n'est pas déjà présent
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true },
    });
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

    // Convertir la Map en tableau et mettre le user connecté en premier
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

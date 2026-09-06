import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizePair } from '../utils/conversation.js';
import { createNotification } from '../lib/notifications.js';
import { signUrlIfNeeded } from '../lib/storage-online.js';

export const socialRouter = Router();

const socialParamsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

socialRouter.post('/:userId/follow', requireAuth, async (req, res, next) => {
  try {
    const { userId: followingId } = socialParamsSchema.parse(req.params);
    const followerId = req.user!.id;
    const [a, b] = normalizePair(followerId, followingId);

    if (a === b) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    await createNotification({
      userId: followingId,
      type: 'follow.created',
      title: 'Nouveau follower',
      body: 'Un utilisateur suit maintenant votre profil.',
      data: { followerId },
    });

    res.status(201).json({ follow });
  } catch (error) {
    next(error);
  }
});

socialRouter.delete('/:userId/follow', requireAuth, async (req, res, next) => {
  try {
    const { userId: followingId } = socialParamsSchema.parse(req.params);
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: req.user!.id,
          followingId,
        },
      },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});



// Récupérer la liste des abonnés (followers)
socialRouter.get('/followers', requireAuth, async (req, res, next) => {
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: req.user!.id },
      include: {
        follower: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const signedFollowers = await Promise.all(
      followers.map(async (f) => ({
        ...f.follower,
        avatarUrl: (await signUrlIfNeeded(f.follower.avatarUrl)) || f.follower.avatarUrl,
      }))
    );

    res.json({ followers: signedFollowers });
  } catch (error) {
    next(error);
  }
});

// Récupérer la liste des comptes suivis (following)
socialRouter.get('/following', requireAuth, async (req, res, next) => {
  try {
    const following = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      include: {
        following: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const signedFollowing = await Promise.all(
      following.map(async (f) => ({
        ...f.following,
        avatarUrl: (await signUrlIfNeeded(f.following.avatarUrl)) || f.following.avatarUrl,
      }))
    );

    res.json({ following: signedFollowing });
  } catch (error) {
    next(error);
  }
});

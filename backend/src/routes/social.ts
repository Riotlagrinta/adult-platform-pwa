import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { normalizePair } from '../utils/conversation.js';
import { createNotification } from '../lib/notifications.js';

export const socialRouter = Router();

socialRouter.post('/:userId/follow', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const followerId = req.user!.id;
    const followingId = String(req.params.userId);
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

socialRouter.delete('/:userId/follow', requireAuth, requireApproved, async (req, res, next) => {
  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: req.user!.id,
          followingId: String(req.params.userId),
        },
      },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

socialRouter.get('/feed', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Récupérer la liste des utilisateurs bloqués et bloquants
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    const blockedUserIds = new Set(
      blocks.flatMap((b) => [b.blockerId, b.blockedId])
    );

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = new Set(following.map((entry: { followingId: string }) => entry.followingId));

    const feed = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true } },
        likes: true,
        comments: true,
        media: true,
      },
    });

    const visibleFeed = feed.filter((post) => {
      // Masquer les posts des personnes bloquées ou bloquantes
      if (blockedUserIds.has(post.authorId) && post.authorId !== userId) {
        return false;
      }

      if (post.authorId === userId) {
        return true;
      }

      if (post.visibility === 'PUBLIC') {
        return true;
      }

      if (post.visibility === 'FOLLOWERS') {
        return followingIds.has(post.authorId);
      }

      return true;
    });

    res.json({ feed: visibleFeed });
  } catch (error) {
    next(error);
  }
});

// Récupérer la liste des abonnés (followers)
socialRouter.get('/followers', requireAuth, requireApproved, async (req, res, next) => {
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
    res.json({ followers: followers.map((f) => f.follower) });
  } catch (error) {
    next(error);
  }
});

// Récupérer la liste des comptes suivis (following)
socialRouter.get('/following', requireAuth, requireApproved, async (req, res, next) => {
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
    res.json({ following: following.map((f) => f.following) });
  } catch (error) {
    next(error);
  }
});

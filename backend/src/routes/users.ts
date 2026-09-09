import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { signUrlIfNeeded } from '../lib/storage-online.js';
import { isUserOnline, areMutualFollowers } from '../lib/socket.js';

export const usersRouter = Router();

usersRouter.get('/search', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      q: z.string().max(80).optional(),
    });

    const { q } = schema.parse(req.query);
    const trimmed = q?.trim();

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user!.id },
        verificationStatus: { not: 'SUSPENDED' },
        ...(trimmed
          ? {
              OR: [
                { displayName: { contains: trimmed, mode: 'insensitive' } },
                { bio: { contains: trimmed, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        verificationStatus: true,
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const signedUsers = await Promise.all(
      users.map(async (u) => ({
        ...u,
        avatarUrl: await signUrlIfNeeded(u.avatarUrl),
      }))
    );

    res.json({ users: signedUsers });
  } catch (error) {
    next(error);
  }
});

const userParamsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

usersRouter.get('/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = userParamsSchema.parse(req.params);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        verificationStatus: true,
        profile: true,
        lastSeenAt: true,
      },
    });

    if (!user || user.verificationStatus === 'SUSPENDED') {
      return res.status(404).json({ error: 'User not found' });
    }

    const isSelf = req.user!.id === userId;
    const isMutual = isSelf || (await areMutualFollowers(req.user!.id, userId));

    const signedUser = {
      ...user,
      avatarUrl: await signUrlIfNeeded(user.avatarUrl),
      isMutual,
      isOnline: isMutual ? isUserOnline(userId) : null,
      lastSeenAt: isMutual ? user.lastSeenAt : null,
    };

    res.json({ user: signedUser });
  } catch (error) {
    next(error);
  }
});

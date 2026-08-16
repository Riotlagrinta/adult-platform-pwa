import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { signUrlIfNeeded } from '../lib/storage-online.js';


export const usersRouter = Router();

usersRouter.get('/search', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const schema = z.object({
      q: z.string().max(80).optional(),
    });

    const { q } = schema.parse(req.query);
    const users = await prisma.user.findMany({
      where: q
        ? {
            verificationStatus: 'APPROVED',
            OR: [
              { displayName: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } },
            ],
          }
        : { verificationStatus: 'APPROVED' },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        verificationStatus: true,
        profile: true,
      },
      take: 20,
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

usersRouter.get('/:userId', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: String(req.params.userId) },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        verificationStatus: true,
        profile: true,
      },
    });

    if (!user || user.verificationStatus !== 'APPROVED') {
      return res.status(404).json({ error: 'User not found' });
    }

    const signedUser = {
      ...user,
      avatarUrl: await signUrlIfNeeded(user.avatarUrl),
    };

    res.json({ user: signedUser });
  } catch (error) {
    next(error);
  }
});

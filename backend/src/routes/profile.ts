import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const profileRouter = Router();

profileRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            verificationStatus: true,
            bio: true,
            avatarUrl: true,
            dateOfBirth: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

const updateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
  city: z.string().max(120).optional(),
  headline: z.string().max(120).optional(),
});

profileRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        profile: {
          upsert: {
            create: {
              city: data.city,
              headline: data.headline,
            },
            update: {
              city: data.city,
              headline: data.headline,
            },
          },
        },
      },
      select: { id: true, displayName: true, bio: true, avatarUrl: true, profile: true },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

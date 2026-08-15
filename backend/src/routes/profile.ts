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

    if (data.displayName) {
      const normalizedDisplayName = data.displayName.trim();
      const existingUser = await prisma.user.findFirst({
        where: {
          displayName: {
            equals: normalizedDisplayName,
            mode: 'insensitive',
          },
          id: {
            not: req.user!.id,
          },
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Ce pseudonyme est déjà utilisé par un autre membre.' });
      }
    }

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

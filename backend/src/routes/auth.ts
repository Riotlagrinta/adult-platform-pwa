import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  dateOfBirth: z.string().datetime().optional(),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Validation de l'e-mail unique
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Cette adresse e-mail est déjà associée à un compte.' });
    }

    // Validation du pseudonyme unique (insensible à la casse)
    const normalizedDisplayName = data.displayName.trim();
    const existingUser = await prisma.user.findFirst({
      where: {
        displayName: {
          equals: normalizedDisplayName,
          mode: 'insensitive',
        },
      },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Ce pseudonyme est déjà utilisé par un autre membre.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.displayName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        verificationStatus: 'APPROVED',
        profile: { create: {} },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        verificationStatus: true,
      },
    });

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ sub: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        verificationStatus: true,
        bio: true,
        avatarUrl: true,
        profile: true,
      },
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});


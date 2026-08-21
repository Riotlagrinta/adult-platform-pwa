import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { signUrlIfNeeded } from '../lib/storage-online.js';


export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  displayName: z.string().min(2, 'Le pseudonyme doit contenir au moins 2 caractères').max(80, 'Le pseudonyme ne peut pas dépasser 80 caractères'),
  dateOfBirth: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Date de naissance invalide',
  }),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();
    const normalizedDisplayName = data.displayName.trim();

    // Validation de l'âge minimum de 18 ans
    const dob = new Date(data.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      return res.status(400).json({ error: 'Vous devez avoir au moins 18 ans pour vous inscrire.' });
    }

    // Validation de l'e-mail unique
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Cette adresse e-mail est déjà associée à un compte.' });
    }

    // Validation du pseudonyme unique (insensible à la casse)
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

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: normalizedDisplayName,
        dateOfBirth: dob,
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
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect' });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect' });
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

    if (user) {
      user.avatarUrl = await signUrlIfNeeded(user.avatarUrl);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Modification du mot de passe
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
});

authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ ok: true, message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    next(error);
  }
});



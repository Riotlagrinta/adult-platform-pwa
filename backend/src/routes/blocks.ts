import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';

export const blocksRouter = Router();

// Bloquer un utilisateur
blocksRouter.post('/', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const schema = z.object({
      blockedId: z.string(),
    });

    const { blockedId } = schema.parse(req.body);
    const blockerId = req.user!.id;

    if (blockerId === blockedId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous bloquer vous-même.' });
    }

    // Vérifier si l'utilisateur à bloquer existe
    const targetUser = await prisma.user.findUnique({
      where: { id: blockedId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    // Créer le blocage (ou l'ignorer s'il existe déjà)
    const block = await prisma.block.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });

    // Supprimer la relation de follow si elle existe entre ces deux utilisateurs
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    });

    res.status(201).json({ success: true, block });
  } catch (error) {
    next(error);
  }
});

// Débloquer un utilisateur
blocksRouter.delete('/:blockedId', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const blockerId = req.user!.id;
    const blockedId = String(req.params.blockedId);

    await prisma.block.delete({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Lister les utilisateurs bloqués
blocksRouter.get('/', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const blockerId = req.user!.id;
    const blocks = await prisma.block.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const blockedUsers = blocks.map((b) => b.blocked);
    res.json({ blockedUsers });
  } catch (error) {
    next(error);
  }
});

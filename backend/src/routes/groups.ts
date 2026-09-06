import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../lib/socket.js';
import { signUrlIfNeeded } from '../lib/storage-online.js';

export const groupsRouter = Router();

const createGroupSchema = z.object({
  name: z.string().min(2, 'Nom du groupe requis').max(80),
  description: z.string().max(300).optional(),
  memberIds: z.array(z.string()).optional().default([]),
});

// Créer un nouveau groupe de discussion
groupsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, description, memberIds } = createGroupSchema.parse(req.body);

    const group = await prisma.group.create({
      data: {
        name,
        description,
        creatorId: req.user!.id,
        members: {
          create: [
            { userId: req.user!.id, role: 'ADMIN' },
            ...memberIds.filter((id) => id !== req.user!.id).map((userId) => ({
              userId,
              role: 'MEMBER',
            })),
          ],
        },
      },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
});

// Récupérer tous les groupes dont l'utilisateur est membre
groupsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userMemberships = await prisma.groupMember.findMany({
      where: { userId: req.user!.id },
      select: { groupId: true },
    });
    const groupIds = userMemberships.map((m) => m.groupId);

    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { id: { in: groupIds } },
          { creatorId: req.user!.id },
        ],
      },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ groups });
  } catch (error) {
    next(error);
  }
});

// Récupérer le détail d'un groupe avec messages
groupsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const groupId = String(req.params.id);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
          include: {
            sender: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Groupe non trouvé' });
    }

    res.json({ group });
  } catch (error) {
    next(error);
  }
});

const sendGroupMessageSchema = z.object({
  text: z.string().max(2000).optional(),
  mediaUrl: z.string().optional(),
  mimeType: z.string().optional(),
});

// Envoyer un message dans le groupe
groupsRouter.post('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const groupId = String(req.params.id);
    const { text, mediaUrl, mimeType } = sendGroupMessageSchema.parse(req.body);

    if (!text?.trim() && !mediaUrl) {
      return res.status(400).json({ error: 'Message vide' });
    }

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      // Auto-join si pas encore membre
      await prisma.groupMember.create({
        data: { groupId, userId: req.user!.id, role: 'MEMBER' },
      });
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        senderId: req.user!.id,
        text: text?.trim() || null,
        mediaUrl: mediaUrl || null,
        mimeType: mimeType || null,
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Mettre à jour updatedAt du groupe
    await prisma.group.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    // Émettre à tous les membres
    const allMembers = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    allMembers.forEach((m) => {
      emitToUser(m.userId, 'group:message:new', { groupId, message });
    });

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

// Rejoindre un groupe
groupsRouter.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const groupId = String(req.params.id);

    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId: req.user!.id,
        },
      },
      create: { groupId, userId: req.user!.id, role: 'MEMBER' },
      update: {},
    });

    res.json({ ok: true, message: 'Vous avez rejoint le groupe' });
  } catch (error) {
    next(error);
  }
});

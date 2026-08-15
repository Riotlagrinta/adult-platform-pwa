import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { normalizePair } from '../utils/conversation.js';
import { createNotification } from '../lib/notifications.js';
import { emitToUser } from '../lib/socket.js';
import type { MediaInput } from '../lib/media.js';

export const messageRouter = Router();

const mediaSchema = z.object({
  kind: z.enum(['IMAGE', 'VIDEO']),
  url: z.string().url(),
  mimeType: z.string().min(3),
  durationSeconds: z.number().int().positive().optional(),
  allowDownload: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});

messageRouter.get('/conversations', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ userAId: req.user!.id }, { userBId: req.user!.id }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

messageRouter.post('/conversations/:userId', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const otherUserId = String(req.params.userId);
    const blockerId = req.user!.id;

    if (blockerId === otherUserId) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    // Vérifier si un blocage existe
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: blockerId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: blockerId },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({ error: 'Action impossible : l\'un des utilisateurs a bloqué l\'autre.' });
    }

    const [userAId, userBId] = normalizePair(blockerId, otherUserId);
    const conversation = await prisma.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    });
    res.status(201).json({ conversation });
  } catch (error) {
    next(error);
  }
});

messageRouter.post('/conversations/:conversationId/messages', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const schema = z.object({
      text: z.string().max(4000).optional(),
      media: z.union([mediaSchema, z.array(mediaSchema).max(10)]).optional(),
    });

    const data = schema.parse(req.body);
    const mediaItems = data.media ? (Array.isArray(data.media) ? data.media : [data.media]) : [];

    const conversation = await prisma.conversation.findUnique({
      where: { id: String(req.params.conversationId) },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userAId !== req.user!.id && conversation.userBId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Vérifier si un blocage existe
    const recipientId = conversation.userAId === req.user!.id ? conversation.userBId : conversation.userAId;
    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: req.user!.id, blockedId: recipientId },
          { blockerId: recipientId, blockedId: req.user!.id },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({ error: 'Action impossible : l\'un des utilisateurs a bloqué l\'autre.' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: String(req.params.conversationId),
        senderId: req.user!.id,
        kind: mediaItems.length ? 'MEDIA' : 'TEXT',
        text: data.text,
        media: mediaItems.length ? {
          create: mediaItems.map((item: MediaInput) => ({
            kind: item.kind,
            url: item.url,
            mimeType: item.mimeType,
            durationSeconds: item.durationSeconds,
            allowDownload: item.allowDownload,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
          })),
        } : undefined,
      },
      include: { media: true },
    });

    // The recipient is already determined above as recipientId

    // Push message in real-time to both participants
    emitToUser(req.user!.id, 'message:new', { message, conversationId: conversation.id });
    emitToUser(recipientId, 'message:new', { message, conversationId: conversation.id });

    await createNotification({
      userId: recipientId,
      type: 'message.received',
      title: 'Nouveau message',
      body: data.text ?? 'Vous avez reçu un média privé.',
      data: {
        conversationId: conversation.id,
        messageId: message.id,
      },
    });

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

// Enregistrer l'ouverture d'un média temporaire et calculer sa date de péremption
messageRouter.post('/media/:mediaId/open', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const mediaId = String(req.params.mediaId);
    const userId = req.user!.id;

    // Trouver le média et vérifier s'il appartient à une conversation de l'utilisateur
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        message: {
          include: {
            conversation: true,
          },
        },
      },
    });

    if (!media || !media.message) {
      return res.status(404).json({ error: 'Média non trouvé.' });
    }

    const conv = media.message.conversation;
    if (conv.userAId !== userId && conv.userBId !== userId) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }

    // Si le média est expiré
    if (media.expiresAt && media.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Ce média a déjà expiré.' });
    }

    const updates: Record<string, any> = {
      openedAt: new Date(),
    };

    // Si c'est un média temporaire et qu'il est ouvert pour la première fois, on calcule l'expiration
    if (media.durationSeconds && !media.openedAt) {
      updates.expiresAt = new Date(Date.now() + media.durationSeconds * 1000);
    }

    const updatedMedia = await prisma.media.update({
      where: { id: mediaId },
      data: updates,
    });

    res.json({ success: true, media: updatedMedia });
  } catch (error) {
    next(error);
  }
});

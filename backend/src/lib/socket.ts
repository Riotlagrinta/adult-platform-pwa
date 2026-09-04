import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './jwt.js';
import { prisma } from './prisma.js';
import { normalizePair } from '../utils/conversation.js';
import type { MediaInput } from './media.js';
import { signUrlIfNeeded } from './storage-online.js';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: 'USER' | 'MODERATOR' | 'ADMIN';
}

// ── State ──────────────────────────────────────────────────────────────────

/** Map userId → Set of active socket IDs (multi-tab support) */
const onlineUsers = new Map<string, Set<string>>();

let io: Server | null = null;

// ── Public API ─────────────────────────────────────────────────────────────

/** Emit an event to all sockets of a specific user */
export function emitToUser(userId: string, event: string, data: unknown) {
  if (!io) return;
  // 1. Room-based broadcast (fiabilité maximale multi-onglets / reconnexion)
  io.to(`user:${userId}`).emit(event, data);

  // 2. Sécurité additionnelle : émettre aussi aux sockets individuels
  const sockets = onlineUsers.get(userId);
  if (sockets && sockets.size > 0) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

/** Check whether a user has any active socket */
export function isUserOnline(userId: string): boolean {
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
}

/** Get the Socket.io server instance */
export function getIO(): Server | null {
  return io;
}

/** Get the number of unique online users */
export function getOnlineCount(): number {
  return onlineUsers.size;
}

// ── Initialisation ─────────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Permissive CORS to allow websocket handshake from vercel, localhost and PWA
        callback(null, true);
      },
      credentials: true,
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // ── JWT Authentication Middleware ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token);
      (socket as AuthenticatedSocket).userId = payload.sub;
      (socket as AuthenticatedSocket).userRole = payload.role;
      next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  // ── Connection Handler ────────────────────────────────────────────────
  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { userId } = socket;

    // Join room for this user
    socket.join(`user:${userId}`);

    // Register presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast online status (only on first socket for this user)
    if (onlineUsers.get(userId)!.size === 1) {
      socket.broadcast.emit('user:online', { userId });
    }

    console.log(`[Socket.io] ${userId} connected (socket: ${socket.id}, joined room user:${userId})`);

    // ── Typing indicators ───────────────────────────────────────────────
    socket.on('typing:start', (data: { conversationId: string; recipientId: string }) => {
      emitToUser(data.recipientId, 'typing:update', {
        conversationId: data.conversationId,
        userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data: { conversationId: string; recipientId: string }) => {
      emitToUser(data.recipientId, 'typing:update', {
        conversationId: data.conversationId,
        userId,
        isTyping: false,
      });
    });

    // ── Send message via WebSocket ──────────────────────────────────────
    socket.on('message:send', async (data: {
      conversationId: string;
      text?: string;
      replyToId?: string;
      media?: MediaInput[];
    }, ack?: (response: { ok: boolean; message?: unknown; error?: string }) => void) => {
      try {
        const { conversationId, text, replyToId, media } = data;
        const mediaItems = media ?? [];

        // Verify the user is approved
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { verificationStatus: true },
        });

        if (!user || user.verificationStatus !== 'APPROVED') {
          ack?.({ ok: false, error: 'Account not approved' });
          return;
        }

        // Verify the conversation exists and the user is a participant
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          ack?.({ ok: false, error: 'Conversation not found' });
          return;
        }

        if (conversation.userAId !== userId && conversation.userBId !== userId) {
          ack?.({ ok: false, error: 'Forbidden' });
          return;
        }

        // Vérifier si un blocage existe
        const recipientId = conversation.userAId === userId
          ? conversation.userBId
          : conversation.userAId;

        const isBlocked = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: recipientId },
              { blockerId: recipientId, blockedId: userId },
            ],
          },
        });

        if (isBlocked) {
          ack?.({ ok: false, error: 'Action impossible : l\'un des utilisateurs a bloqué l\'autre.' });
          return;
        }

        // Create the message in DB with replyTo relation
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            replyToId: replyToId || null,
            kind: mediaItems.length ? 'MEDIA' : 'TEXT',
            text: text || null,
            media: mediaItems.length
              ? {
                  create: mediaItems.map((item: MediaInput) => ({
                    kind: item.kind,
                    url: item.url,
                    mimeType: item.mimeType,
                    durationSeconds: item.durationSeconds,
                    allowDownload: item.allowDownload,
                    expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
                  })),
                }
              : undefined,
          },
          include: {
            media: true,
            replyTo: {
              include: {
                sender: { select: { id: true, displayName: true } },
                media: true,
              },
            },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Sign media URLs
        const signedMedia = await Promise.all(
          message.media.map(async (med) => ({
            ...med,
            url: (await signUrlIfNeeded(med.url)) || med.url,
          }))
        );

        let signedReplyTo = message.replyTo;
        if (signedReplyTo && signedReplyTo.media && signedReplyTo.media.length) {
          const signedReplyMedia = await Promise.all(
            signedReplyTo.media.map(async (med) => ({
              ...med,
              url: (await signUrlIfNeeded(med.url)) || med.url,
            }))
          );
          signedReplyTo = { ...signedReplyTo, media: signedReplyMedia };
        }

        const signedMessage = {
          ...message,
          media: signedMedia,
          replyTo: signedReplyTo,
        };

        // Push message to the sender (confirmation) and recipient
        emitToUser(userId, 'message:new', { message: signedMessage, conversationId });
        emitToUser(recipientId, 'message:new', { message: signedMessage, conversationId });

        // Create a notification for the recipient (will also push via emitToUser)
        const { createNotification } = await import('./notifications.js');
        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });

        await createNotification({
          userId: recipientId,
          type: 'message.received',
          title: sender?.displayName ? `${sender.displayName}` : 'Nouveau message privé',
          body: text ?? '📷 Vous a envoyé un média privé.',
          url: '/messages',
          data: { conversationId, messageId: message.id },
        });

        ack?.({ ok: true, message: signedMessage });
      } catch (error) {
        console.error('[Socket.io] message:send error:', error);
        ack?.({ ok: false, error: 'Internal error' });
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user:offline', { userId });
        }
      }
      console.log(`[Socket.io] ${userId} disconnected (socket: ${socket.id})`);
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
}

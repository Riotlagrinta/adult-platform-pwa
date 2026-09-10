import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './jwt.js';
import { prisma } from './prisma.js';
import { normalizePair } from '../utils/conversation.js';
import type { MediaInput } from './media.js';
import { signUrlIfNeeded } from './storage-online.js';
import { sendPushNotification } from './push.js';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: 'USER' | 'MODERATOR' | 'ADMIN';
}

// ── State ──────────────────────────────────────────────────────────────────

/** Map userId → Set of active socket IDs (multi-tab support) */
const onlineUsers = new Map<string, Set<string>>();

/** Appels en cours de sonnerie : userId appelé → userId appelant */
const pendingCalls = new Map<string, string>();
/** Appels acceptés : userId → userId de l'interlocuteur actuel */
const activeCalls = new Map<string, string>();
/** userId (appelant ou appelé) → id du CallLog courant, pour l'historique des appels */
const callLogIds = new Map<string, string>();

/** Calcule le/la partenaire courant(e) d'un appel (sonnant ou actif) pour userId, si il y en a un */
function getCallPartner(userId: string): string | undefined {
  if (activeCalls.has(userId)) return activeCalls.get(userId);
  if (pendingCalls.has(userId)) return pendingCalls.get(userId); // userId est l'appelé
  for (const [callee, caller] of pendingCalls) {
    if (caller === userId) return callee; // userId est l'appelant
  }
  return undefined;
}

/** Enregistre le dénouement d'un appel dans l'historique (CallLog) */
async function finalizeCallLog(logId: string | undefined, status: 'ENDED' | 'MISSED' | 'REJECTED') {
  if (!logId) return;
  try {
    const log = await prisma.callLog.findUnique({ where: { id: logId } });
    if (!log || log.status !== 'RINGING') return; // déjà finalisé, ne pas écraser
    const endedAt = new Date();
    const durationSeconds = log.connectedAt
      ? Math.max(0, Math.round((endedAt.getTime() - log.connectedAt.getTime()) / 1000))
      : null;
    await prisma.callLog.update({ where: { id: logId }, data: { status, endedAt, durationSeconds } });
  } catch (err) {
    console.error('[CallLog] finalize error:', err);
  }
}

/** Nettoie toute trace d'un appel (sonnant ou actif) impliquant userId, en finalisant son historique */
function clearCallState(userId: string, finalStatus: 'ENDED' | 'MISSED' | 'REJECTED' = 'MISSED') {
  const partner = getCallPartner(userId);
  const logId = callLogIds.get(userId);
  const wasActive = activeCalls.has(userId);

  void finalizeCallLog(logId, wasActive ? 'ENDED' : finalStatus);

  pendingCalls.delete(userId);
  callLogIds.delete(userId);
  for (const [callee, caller] of pendingCalls) {
    if (caller === userId) pendingCalls.delete(callee);
  }
  activeCalls.delete(userId);
  if (partner) {
    activeCalls.delete(partner);
    callLogIds.delete(partner);
  }
}

let io: Server | null = null;

// ── Public API ─────────────────────────────────────────────────────────────

/** Emit an event to all sockets of a specific user */
export function emitToUser(userId: string, event: string, data: unknown) {
  if (!io) return;
  // Chaque socket rejoint déjà la room `user:${userId}` à la connexion (voir plus bas) :
  // un seul broadcast sur cette room suffit à atteindre toutes ses sessions/onglets.
  // Émettre en plus vers chaque socket.id dupliquait chaque événement (messages,
  // notifications, appels entrants reçus deux fois).
  io.to(`user:${userId}`).emit(event, data);
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

/**
 * Vérifie si deux utilisateurs sont abonnés mutuellement (suivi réciproque)
 */
export async function areMutualFollowers(userAId: string, userBId: string): Promise<boolean> {
  if (!userAId || !userBId || userAId === userBId) return false;
  try {
    const [aFollowsB, bFollowsA] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userAId, followingId: userBId } },
      }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userBId, followingId: userAId } },
      }),
    ]);
    return Boolean(aFollowsB && bFollowsA);
  } catch {
    return false;
  }
}

/**
 * Récupère tous les IDs d'utilisateurs qui sont abonnés mutuellement avec userId
 */
export async function getMutualFollowerIds(userId: string): Promise<string[]> {
  try {
    const mutuals = await prisma.follow.findMany({
      where: {
        followerId: userId,
        following: {
          following: {
            some: {
              followingId: userId,
            },
          },
        },
      },
      select: { followingId: true },
    });
    return mutuals.map((m) => m.followingId);
  } catch {
    return [];
  }
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

    // Broadcast online status UNIQUEMENT aux abonnés mutuels
    if (onlineUsers.get(userId)!.size === 1) {
      getMutualFollowerIds(userId).then((mutualIds) => {
        for (const mutualId of mutualIds) {
          emitToUser(mutualId, 'user:online', {
            userId,
            isOnline: true,
          });
        }
      }).catch(console.error);
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

    // ── WebRTC Audio / Vidéo Call Signaling ────────────────────────────
    socket.on('call:initiate', async (data: { targetUserId: string; isVideo?: boolean; conversationId?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
      try {
        const { targetUserId, isVideo, conversationId } = data || {};
        if (!targetUserId || targetUserId === userId) {
          ack?.({ ok: false, error: 'Cible d\'appel invalide' });
          return;
        }

        // Vérifier si un blocage existe
        const isBlocked = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: userId, blockedId: targetUserId },
              { blockerId: targetUserId, blockedId: userId },
            ],
          },
        });
        if (isBlocked) {
          ack?.({ ok: false, error: 'Action impossible : communication bloquée.' });
          return;
        }

        // Récupérer les informations de l'appelant pour l'affichage entrant
        const caller = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, displayName: true, avatarUrl: true },
        });

        // 1. Émettre l'appel entrant via Socket.io aux sessions actives du destinataire
        emitToUser(targetUserId, 'call:incoming', {
          callerId: userId,
          callerName: caller?.displayName || 'Utilisateur',
          callerAvatar: caller?.avatarUrl || null,
          isVideo: Boolean(isVideo),
          conversationId,
        });

        // 2. Envoyer systématiquement une notification Push (Web/PWA/Mobile même en arrière-plan)
        const callType = isVideo ? 'vidéo' : 'vocal';
        const callTitle = `📞 Appel ${callType} entrant`;
        const callBody = `${caller?.displayName || 'Un membre'} vous appelle en direct...`;

        sendPushNotification(targetUserId, {
          title: callTitle,
          body: callBody,
          url: `/messages`,
          tag: `call-${userId}`,
          data: {
            type: 'INCOMING_CALL',
            callerId: userId,
            callerName: caller?.displayName || 'Utilisateur',
            callerAvatar: caller?.avatarUrl || null,
            isVideo: Boolean(isVideo),
          },
        }).catch((err) => {
          console.warn('[Push] Erreur notification appel:', err);
        });

        // 3. Enregistrer la notification dans l'historique utilisateur
        prisma.notification.create({
          data: {
            userId: targetUserId,
            type: 'INCOMING_CALL',
            title: callTitle,
            body: callBody,
            data: {
              callerId: userId,
              callerName: caller?.displayName || 'Utilisateur',
              isVideo: Boolean(isVideo),
              conversationId,
            },
          },
        }).then((notif) => {
          emitToUser(targetUserId, 'notification:new', notif);
        }).catch(() => {});

        // Enregistrer l'appel en attente pour pouvoir valider accept/reject/end/signal ensuite
        pendingCalls.set(targetUserId, userId);

        // Historique des appels : créer l'entrée dès la sonnerie (reste MISSED si rien ne se passe)
        try {
          const callLog = await prisma.callLog.create({
            data: { callerId: userId, calleeId: targetUserId, isVideo: Boolean(isVideo) },
          });
          callLogIds.set(userId, callLog.id);
          callLogIds.set(targetUserId, callLog.id);
        } catch (err) {
          console.error('[CallLog] create error:', err);
        }

        // L'appel sonne normalement pour l'appelant (jamais rejeté arbitrairement)
        ack?.({ ok: true });
      } catch (err) {
        console.error('[Socket.io] call:initiate error:', err);
        ack?.({ ok: false, error: 'Erreur lors de l\'initialisation de l\'appel' });
      }
    });

    // Un appel n'existe que si `pendingCalls`/`activeCalls` le confirme : évite qu'un
    // utilisateur quelconque raccroche ou injecte du signal WebRTC dans l'appel d'un autre.
    socket.on('call:accept', (data: { callerId: string }) => {
      if (data?.callerId && pendingCalls.get(userId) === data.callerId) {
        pendingCalls.delete(userId);
        activeCalls.set(userId, data.callerId);
        activeCalls.set(data.callerId, userId);
        const logId = callLogIds.get(userId);
        if (logId) {
          prisma.callLog.update({ where: { id: logId }, data: { connectedAt: new Date() } }).catch((err) => {
            console.error('[CallLog] accept update error:', err);
          });
        }
        emitToUser(data.callerId, 'call:accepted', { recipientId: userId });
      }
    });

    socket.on('call:reject', (data: { callerId: string; reason?: string }) => {
      if (data?.callerId && pendingCalls.get(userId) === data.callerId) {
        void finalizeCallLog(callLogIds.get(userId), 'REJECTED');
        pendingCalls.delete(userId);
        callLogIds.delete(userId);
        emitToUser(data.callerId, 'call:rejected', { recipientId: userId, reason: data.reason || 'declined' });
      }
    });

    socket.on('call:end', (data: { targetUserId: string }) => {
      const isPending = pendingCalls.get(data?.targetUserId) === userId || pendingCalls.get(userId) === data?.targetUserId;
      const isActive = activeCalls.get(userId) === data?.targetUserId;
      if (data?.targetUserId && (isPending || isActive)) {
        clearCallState(userId, 'MISSED');
        emitToUser(data.targetUserId, 'call:ended', { fromUserId: userId });
      }
    });

    socket.on('call:signal', (data: { targetUserId: string; signal: unknown }) => {
      const inCallTogether = activeCalls.get(userId) === data?.targetUserId || pendingCalls.get(userId) === data?.targetUserId || pendingCalls.get(data?.targetUserId) === userId;
      if (data?.targetUserId && data?.signal && inCallTogether) {
        emitToUser(data.targetUserId, 'call:signal', {
          senderId: userId,
          signal: data.signal,
        });
      }
    });

    // ── Requête de statut de présence en temps réel ─────────────────────
    socket.on('presence:request', async (data: { targetUserId: string }, ack?: (response: { isOnline: boolean; lastSeenAt: string | null; isMutual: boolean }) => void) => {
      try {
        const { targetUserId } = data || {};
        if (!targetUserId) return;

        const isMutual = await areMutualFollowers(userId, targetUserId);
        if (!isMutual) {
          const res = { isOnline: false, lastSeenAt: null, isMutual: false };
          ack?.(res);
          socket.emit('presence:update', { userId: targetUserId, ...res });
          return;
        }

        const online = isUserOnline(targetUserId);
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { lastSeenAt: true },
        });

        const res = {
          isOnline: online,
          lastSeenAt: targetUser?.lastSeenAt?.toISOString() ?? null,
          isMutual: true,
        };
        ack?.(res);
        socket.emit('presence:update', { userId: targetUserId, ...res });
      } catch (err) {
        console.error('[Socket.io] presence:request error:', err);
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Terminer proprement tout appel en cours si c'était la dernière session active
          const activePartner = activeCalls.get(userId);
          const pendingCaller = pendingCalls.get(userId);
          clearCallState(userId);
          if (activePartner) emitToUser(activePartner, 'call:ended', { fromUserId: userId });
          if (pendingCaller) emitToUser(pendingCaller, 'call:rejected', { recipientId: userId, reason: 'offline' });

          const now = new Date();
          // Sauvegarder la dernière date de connexion en BDD
          await prisma.user.update({
            where: { id: userId },
            data: { lastSeenAt: now },
          }).catch(() => {});

          // Notifier UNIQUEMENT les abonnés mutuels
          const mutualIds = await getMutualFollowerIds(userId).catch(() => []);
          for (const mutualId of mutualIds) {
            emitToUser(mutualId, 'user:offline', {
              userId,
              isOnline: false,
              lastSeenAt: now.toISOString(),
            });
          }
        }
      }
      console.log(`[Socket.io] ${userId} disconnected (socket: ${socket.id})`);
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
}

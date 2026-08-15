'use client';

import { useEffect, useCallback, useState } from 'react';
import { getSocket, getCurrentSocket } from '@/lib/socket';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SocketMessage {
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    kind: 'TEXT' | 'MEDIA';
    text: string | null;
    media: unknown[];
    createdAt: string;
  };
  conversationId: string;
}

export interface SocketNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface TypingUpdate {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────

interface UseSocketOptions {
  /** JWT token for authentication */
  token: string | null;
  /** Callback when a new message is received */
  onMessage?: (data: SocketMessage) => void;
  /** Callback when a new notification is received */
  onNotification?: (data: SocketNotification) => void;
  /** Callback when someone starts/stops typing */
  onTyping?: (data: TypingUpdate) => void;
  /** Callback when a user comes online */
  onUserOnline?: (data: PresenceEvent) => void;
  /** Callback when a user goes offline */
  onUserOffline?: (data: PresenceEvent) => void;
}

export function useSocket(options: UseSocketOptions) {
  const {
    token,
    onMessage,
    onNotification,
    onTyping,
    onUserOnline,
    onUserOffline,
  } = options;

  const [isConnected, setIsConnected] = useState(() => getCurrentSocket()?.connected ?? false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // ── Connect / Disconnect ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleMessage = (data: SocketMessage) => {
      onMessage?.(data);
    };

    const handleNotification = (data: SocketNotification) => {
      onNotification?.(data);
    };

    const handleTyping = (data: TypingUpdate) => {
      onTyping?.(data);
    };

    const handleUserOnline = (data: PresenceEvent) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
      onUserOnline?.(data);
    };

    const handleUserOffline = (data: PresenceEvent) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
      onUserOffline?.(data);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message:new', handleMessage);
    socket.on('notification:new', handleNotification);
    socket.on('typing:update', handleTyping);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message:new', handleMessage);
      socket.off('notification:new', handleNotification);
      socket.off('typing:update', handleTyping);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [token, onMessage, onNotification, onTyping, onUserOnline, onUserOffline]);

  // ── Actions ─────────────────────────────────────────────────────────────

  /** Send a message via WebSocket (bypass REST) */
  const sendMessage = useCallback(
    (conversationId: string, text?: string, media?: unknown[]) => {
      return new Promise<SocketMessage['message']>((resolve, reject) => {
        const socket = getCurrentSocket();
        if (!socket?.connected) {
          reject(new Error('Socket not connected'));
          return;
        }
        socket.emit(
          'message:send',
          { conversationId, text, media },
          (response: { ok: boolean; message?: SocketMessage['message']; error?: string }) => {
            if (response.ok && response.message) {
              resolve(response.message);
            } else {
              reject(new Error(response.error ?? 'Failed to send message'));
            }
          }
        );
      });
    },
    []
  );

  /** Emit typing start event */
  const startTyping = useCallback((conversationId: string, recipientId: string) => {
    getCurrentSocket()?.emit('typing:start', { conversationId, recipientId });
  }, []);

  /** Emit typing stop event */
  const stopTyping = useCallback((conversationId: string, recipientId: string) => {
    getCurrentSocket()?.emit('typing:stop', { conversationId, recipientId });
  }, []);

  return {
    isConnected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    socket: getCurrentSocket(),
  };
}

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Initialise (or return existing) Socket.io connection.
 * The JWT token is sent during the handshake for authentication.
 */
export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket.io] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.io] Disconnected:', reason);
  });

  return socket;
}

/**
 * Disconnect and clean up the socket instance.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance without creating a new one.
 */
export function getCurrentSocket(): Socket | null {
  return socket;
}

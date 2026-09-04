import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket: Socket | null = null;
let currentToken: string | null = null;

/**
 * Initialise (ou retourne l'existant) de la connexion Socket.io.
 * Le token JWT est transmis lors du handshake pour l'authentification.
 */
export function getSocket(token: string): Socket {
  if (socket) {
    if (currentToken !== token) {
      currentToken = token;
      socket.auth = { token };
      if (socket.connected) {
        socket.disconnect().connect();
      } else {
        socket.connect();
      }
    } else if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  currentToken = token;
  const baseUrl = getApiBaseUrl();

  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Connected successfully with ID:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket.io] Connection warning:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.io] Disconnected:', reason);
  });

  return socket;
}

/**
 * Déconnecter et nettoyer l'instance de socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

/**
 * Obtenir l'instance courante sans en créer une nouvelle.
 */
export function getCurrentSocket(): Socket | null {
  return socket;
}

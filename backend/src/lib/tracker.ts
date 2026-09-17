import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import { Server as TrackerServer } from 'bittorrent-tracker';
import { verifyToken } from './jwt.js';
import { prisma } from './prisma.js';

// Chemin dédié pour ne pas entrer en collision avec Socket.io (qui écoute `/socket.io`
// sur le même http.Server) : chaque écouteur `upgrade` ignore les requêtes dont le
// chemin ne le concerne pas.
export const TRACKER_PATH = '/wt-tracker';

let trackerServer: TrackerServer | null = null;

/**
 * Démarre un tracker BitTorrent WebSocket auto-hébergé, attaché au même http.Server
 * qu'Express/Socket.io (pas de second service Render). Gated par le JWT existant :
 * seul un utilisateur authentifié peut établir la connexion WebSocket d'annonce.
 *
 * Le tracker ne sert qu'à la mise en relation des pairs (offres/réponses WebRTC) —
 * aucun octet de fichier ne transite jamais par ce serveur.
 */
export function attachFileShareTracker(httpServer: HttpServer): TrackerServer {
  if (trackerServer) {
    return trackerServer;
  }

  trackerServer = new TrackerServer({
    udp: false,
    http: false,
    stats: false,
    ws: { noServer: true },
    // Seuls les info_hash correspondant à un FileShare connu et non arrêté peuvent
    // s'annoncer — empêche que ce tracker serve de mise en relation générique pour
    // n'importe quel contenu torrent externe.
    filter: (infoHash, _params, cb) => {
      prisma.fileShare
        .findUnique({ where: { infoHash }, select: { status: true } })
        .then((share) => {
          if (!share || share.status === 'STOPPED') {
            cb(new Error('Partage inconnu ou arrêté'));
          } else {
            cb();
          }
        })
        .catch(() => cb(new Error('Erreur de vérification du partage')));
    },
  });

  trackerServer.on('error', (err: Error) => {
    console.error('[tracker] error:', err.message);
  });
  trackerServer.on('warning', (err: Error) => {
    console.warn('[tracker] warning:', err.message);
  });

  httpServer.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    let pathname: string;
    try {
      pathname = new URL(req.url ?? '', 'http://internal').pathname;
    } catch {
      return;
    }
    if (pathname !== TRACKER_PATH) {
      return; // Pas notre requête (probablement Socket.io) : ne pas toucher au socket.
    }

    const token = new URL(req.url ?? '', 'http://internal').searchParams.get('token');
    if (!token) {
      socket.destroy();
      return;
    }

    try {
      verifyToken(token);
    } catch {
      socket.destroy();
      return;
    }

    const ws = trackerServer!.ws;
    if (!ws) {
      socket.destroy();
      return;
    }
    ws.handleUpgrade(req, socket, head, (client) => {
      ws.emit('connection', client, req);
    });
  });

  console.log(`🧲 Tracker BitTorrent (partage de fichiers) actif sur ${TRACKER_PATH}`);

  return trackerServer;
}

export function closeFileShareTracker() {
  trackerServer?.close();
  trackerServer = null;
}

import { prisma } from './prisma.js';
import type { FileShare } from '@prisma/client';

// Un partage `ACTIVE` sans heartbeat depuis ce délai est considéré comme n'ayant plus
// de seeder actif (l'onglet/l'appli du propriétaire a probablement été fermé).
const INACTIVE_AFTER_MS = 5 * 60 * 1000;
// Au-delà, il n'a plus de raison de rester en base (personne ne peut plus le rejoindre).
const DELETE_AFTER_INACTIVE_MS = 75 * 24 * 60 * 60 * 1000; // ~75 jours

/**
 * Sérialise un FileShare pour une réponse JSON : `BigInt` ne se sérialise pas
 * nativement (JSON.stringify lève une exception dessus), il faut le convertir en string.
 */
export function serializeFileShare(share: FileShare) {
  return {
    ...share,
    totalSizeBytes: share.totalSizeBytes.toString(),
  };
}

export async function cleanupStaleShares() {
  const now = new Date();

  // ACTIVE → INACTIVE : plus de heartbeat récent.
  await prisma.fileShare.updateMany({
    where: {
      status: 'ACTIVE',
      lastSeenActiveAt: { lt: new Date(now.getTime() - INACTIVE_AFTER_MS) },
    },
    data: { status: 'INACTIVE' },
  });

  // Suppression définitive des partages inactifs depuis très longtemps (ou jamais
  // devenus actifs). Rien à nettoyer côté stockage : le serveur n'a jamais eu les octets.
  await prisma.fileShare.deleteMany({
    where: {
      status: { in: ['INACTIVE', 'STOPPED'] },
      updatedAt: { lt: new Date(now.getTime() - DELETE_AFTER_INACTIVE_MS) },
    },
  });
}

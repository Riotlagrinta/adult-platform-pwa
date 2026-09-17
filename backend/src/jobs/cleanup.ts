import { cleanupExpiredMedia } from '../lib/media.js';
import { cleanupStaleShares } from '../lib/shares.js';

let cleanupTimer: NodeJS.Timeout | null = null;
let shareCleanupTimer: NodeJS.Timeout | null = null;

export function startCleanupJobs() {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    cleanupExpiredMedia().catch((error) => {
      console.error('Media cleanup failed', error);
    });
  }, 5 * 60 * 1000);

  cleanupExpiredMedia().catch((error) => {
    console.error('Initial media cleanup failed', error);
  });

  // Moins urgent que le nettoyage des médias éphémères : les partages sont censés
  // rester actifs longtemps (dossiers/jeux volumineux), pas besoin d'un balayage fréquent.
  shareCleanupTimer = setInterval(() => {
    cleanupStaleShares().catch((error) => {
      console.error('File share cleanup failed', error);
    });
  }, 30 * 60 * 1000);

  cleanupStaleShares().catch((error) => {
    console.error('Initial file share cleanup failed', error);
  });
}

export function stopCleanupJobs() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  if (shareCleanupTimer) {
    clearInterval(shareCleanupTimer);
    shareCleanupTimer = null;
  }
}


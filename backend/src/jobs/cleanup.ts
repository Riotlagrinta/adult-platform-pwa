import { cleanupExpiredMedia } from '../lib/media.js';

let cleanupTimer: NodeJS.Timeout | null = null;

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
}

export function stopCleanupJobs() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}


// Ce module importe `webtorrent` dynamiquement — il dépend de WebRTC et n'a de sens
// que côté client. Il ne doit JAMAIS être importé statiquement depuis un composant
// qui participe au rendu serveur (même un Client Component "use client" est
// pré-rendu côté serveur par défaut) : dans ce repo, `webtorrent` entraîne
// `@thaunknown/simple-peer` → `webrtc-polyfill` → `node-datachannel` (un binding
// natif Node), ce qui fait planter la compilation Turbopack si le graphe de modules
// est atteignable depuis la passe SSR. Tout composant qui utilise ce fichier doit
// être chargé via `next/dynamic(() => import('./MonComposant'), { ssr: false })`.
import type WebTorrent from "webtorrent";
import { getApiBaseUrl } from "./api";

export const TRACKER_PATH = "/wt-tracker";

function getTrackerAnnounceUrl(token: string) {
  const wsBase = getApiBaseUrl().replace(/^http/, "ws");
  return `${wsBase}${TRACKER_PATH}?token=${encodeURIComponent(token)}`;
}

let clientInstance: WebTorrent | null = null;
let clientToken: string | null = null;

/**
 * Singleton paresseux : un seul client WebTorrent par onglet, recréé uniquement si
 * le token change (reconnexion/nouveau compte). `token` sert à s'authentifier auprès
 * de notre tracker auto-hébergé (voir `backend/src/lib/tracker.ts`).
 */
export async function getWebTorrentClient(token: string): Promise<WebTorrent> {
  if (clientInstance && clientToken === token) {
    return clientInstance;
  }
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
  }

  const { default: WebTorrentCtor } = await import("webtorrent");
  clientInstance = new WebTorrentCtor();
  clientToken = token;
  return clientInstance;
}

export function getAnnounceList(token: string): string[] {
  return [getTrackerAnnounceUrl(token)];
}

/**
 * `create-torrent` (dépendance interne de webtorrent) ne lit que `item.fullPath` ou
 * `item.name` pour construire l'arborescence d'un torrent multi-fichiers — il ignore
 * `webkitRelativePath` (propriété standard des `File` issus d'un `<input webkitdirectory>`).
 * Sans cette étape, la structure de dossier serait perdue et tous les fichiers
 * seraient mis à plat sous leur seul nom.
 */
export function preserveFolderStructure(files: FileList | File[]): File[] {
  const list = Array.from(files);
  for (const file of list) {
    if (file.webkitRelativePath) {
      // Propriété non standard, lue par `create-torrent` — ajout volontaire.
      (file as unknown as { fullPath?: string }).fullPath = file.webkitRelativePath;
    }
  }
  return list;
}

export function destroyWebTorrentClient() {
  clientInstance?.destroy();
  clientInstance = null;
  clientToken = null;
}

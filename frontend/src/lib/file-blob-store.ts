// Store WebTorrent en lecture seule, servant directement les pièces depuis les
// `File` d'origine sélectionnés par l'utilisateur — sans jamais les recopier.
//
// Pourquoi ce fichier existe : le store par défaut de WebTorrent côté navigateur
// (`fs-chunk-store` → remappé en `fsa-chunk-store`) recopie TOUJOURS l'intégralité
// du contenu source dans un espace de stockage séparé (l'Origin Private File
// System du navigateur) avant de pouvoir servir le moindre octet — y compris pour
// un simple partage (seed) d'un fichier qui est déjà entièrement disponible sur le
// disque de l'utilisateur. Pour un partage de 100 Go, ça veut dire des dizaines de
// minutes de copie silencieuse (aucune progression exposée par WebTorrent pour
// cette étape) et 100 Go d'espace disque dupliqués sans prévenir. Comme un `File`
// du navigateur permet déjà une lecture aléatoire efficace via `.slice()`, aucune
// copie n'est nécessaire pour du seed pur (lecture seule).
//
// Utilisé avec `client.seed(files, { preloadedStore: true, store: (chunkLength,
// storeOpts) => new FileBlobStore(chunkLength, storeOpts, files) }, cb)` —
// `preloadedStore: true` indique à WebTorrent que le store contient déjà toutes
// les données, ce qui saute entièrement l'étape de copie (`torrent.load()`).

type StoreCallback<T = void> = (err: Error | null, value?: T) => void;
type StoreFile = { path: string; length: number; offset: number };
type StoreOpts = { length?: number; files?: StoreFile[] };

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Chemin réellement utilisé pour un `File` par `create-torrent` (voir preserveFolderStructure). */
function sourcePathOf(file: File): string {
  const withFullPath = file as File & { fullPath?: string };
  return normalizePath(withFullPath.fullPath || file.name);
}

export class FileBlobStore {
  chunkLength: number;
  length: number;
  private blobs: Blob[]; // même ordre que `files` (storeOpts.files)
  private onPut?: (chunkIndex: number, totalChunks: number) => void;

  constructor(
    chunkLength: number,
    opts: StoreOpts,
    sourceFiles: File[],
    onPut?: (chunkIndex: number, totalChunks: number) => void
  ) {
    this.chunkLength = Number(chunkLength);
    const storeFiles = opts.files ?? [];
    this.length = opts.length ?? storeFiles.reduce((sum, f) => sum + f.length, 0);
    this.onPut = onPut;

    if (storeFiles.length !== sourceFiles.length) {
      throw new Error(
        `FileBlobStore: nombre de fichiers incohérent (torrent: ${storeFiles.length}, source: ${sourceFiles.length})`
      );
    }

    // Association par chemin normalisé quand c'est possible (le plus fiable) ;
    // repli sur l'ordre d'origine sinon (fiable ici aussi : ces fichiers viennent
    // toujours d'un <input type="file">, jamais d'un drag-and-drop réordonné).
    const byPath = new Map(sourceFiles.map((f) => [sourcePathOf(f), f]));
    this.blobs = storeFiles.map((sf, i) => {
      const match = byPath.get(normalizePath(sf.path));
      const file = match ?? sourceFiles[i];
      if (file.size !== sf.length) {
        throw new Error(`FileBlobStore: taille incohérente pour "${sf.path}" (${file.size} ≠ ${sf.length})`);
      }
      return file;
    });

    // Vérification globale : si la somme ne correspond pas, mieux vaut échouer
    // franchement que de servir des données mal alignées à des pairs.
    const totalBlobSize = this.blobs.reduce((sum, b) => sum + b.size, 0);
    if (totalBlobSize !== this.length) {
      throw new Error(`FileBlobStore: taille totale incohérente (${totalBlobSize} ≠ ${this.length})`);
    }
  }

  get(
    index: number,
    optsOrCb: { offset?: number; length?: number } | StoreCallback<Uint8Array>,
    cb?: StoreCallback<Uint8Array>
  ) {
    const callback = (typeof optsOrCb === "function" ? optsOrCb : cb) as StoreCallback<Uint8Array>;
    const opts = typeof optsOrCb === "function" ? {} : optsOrCb ?? {};

    const chunkStart = index * this.chunkLength;
    const wantedStart = chunkStart + (opts.offset ?? 0);
    const wantedEnd = opts.length != null ? wantedStart + opts.length : Math.min(chunkStart + this.chunkLength, this.length);

    if (wantedStart >= this.length || wantedStart >= wantedEnd) {
      queueMicrotask(() => callback(null, new Uint8Array(0)));
      return;
    }

    const slice = this._sliceAcrossFiles(wantedStart, wantedEnd);
    slice
      .arrayBuffer()
      .then((buf) => callback(null, new Uint8Array(buf)))
      .catch((err) => callback(err instanceof Error ? err : new Error(String(err))));
  }

  private _sliceAcrossFiles(start: number, end: number): Blob {
    const parts: Blob[] = [];
    let fileOffset = 0;
    for (const blob of this.blobs) {
      const fileStart = fileOffset;
      const fileEnd = fileOffset + blob.size;
      fileOffset = fileEnd;
      if (fileEnd <= start || fileStart >= end) continue;
      const from = Math.max(start, fileStart) - fileStart;
      const to = Math.min(end, fileEnd) - fileStart;
      parts.push(blob.slice(from, to));
      if (fileEnd >= end) break;
    }
    return parts.length === 1 ? parts[0] : new Blob(parts);
  }

  // Lecture seule : les octets sont déjà disponibles via les `File` d'origine, donc
  // `put()` n'a rien à écrire — mais WebTorrent appelle quand même cette méthode une
  // fois par pièce lors de l'étape de "chargement" initiale (une passe de lecture
  // du contenu source, sans écriture disque celle-ci), ce qui reste le seul moyen
  // d'exposer une progression pour cette étape.
  put(index: number, _buf: Uint8Array, cb?: StoreCallback) {
    if (this.onPut) {
      const totalChunks = Math.ceil(this.length / this.chunkLength);
      this.onPut(index + 1, totalChunks);
    }
    queueMicrotask(() => cb?.(null));
  }

  close(cb?: StoreCallback) {
    queueMicrotask(() => cb?.(null));
  }

  destroy(cb?: StoreCallback) {
    queueMicrotask(() => cb?.(null));
  }
}

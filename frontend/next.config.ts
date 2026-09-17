import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
    // `webtorrent` (partage de fichiers P2P) déclare ces modules Node comme
    // `false` dans son propre champ "browser" — webpack les résout alors en
    // objet vide, mais Turbopack les résout en `undefined`, ce qui fait
    // planter le code défensif de webtorrent (`typeof os.tmpdir === 'function'`)
    // dès le chargement du module. On force un vrai objet vide à la place.
    resolveAlias: {
      os: { browser: "./src/shims/empty-node-module.js" },
      fs: { browser: "./src/shims/empty-node-module.js" },
      net: { browser: "./src/shims/empty-node-module.js" },
      http: { browser: "./src/shims/empty-node-module.js" },
      crypto: { browser: "./src/shims/empty-node-module.js" },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

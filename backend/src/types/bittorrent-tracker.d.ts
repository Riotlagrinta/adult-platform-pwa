// `bittorrent-tracker` ne fournit aucune déclaration TypeScript. On ne type ici que
// la surface réellement utilisée par `lib/tracker.ts` (mode WebSocket "noServer").
declare module 'bittorrent-tracker' {
  import type { IncomingMessage } from 'node:http';
  import type { EventEmitter } from 'node:events';

  export interface TrackerServerOptions {
    interval?: number;
    trustProxy?: boolean;
    http?: boolean;
    udp?: boolean;
    ws?: boolean | { noServer?: boolean };
    stats?: boolean;
    filter?: (infoHash: string, params: Record<string, unknown>, cb: (err?: Error) => void) => void;
  }

  export interface NoServerWebSocketServer extends EventEmitter {
    handleUpgrade(
      req: IncomingMessage,
      socket: import('node:net').Socket,
      head: Buffer,
      callback: (ws: unknown) => void
    ): void;
  }

  export class Server extends EventEmitter {
    constructor(opts?: TrackerServerOptions);
    ws: NoServerWebSocketServer | null;
    close(cb?: () => void): void;
  }
}

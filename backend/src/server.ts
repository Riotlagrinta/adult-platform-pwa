import { createServer as createHttpServer } from 'http';
import { createServer } from './app.js';
import { initSocket } from './lib/socket.js';
import { startCleanupJobs } from './jobs/cleanup.js';

const port = Number(process.env.PORT ?? 4000);
const host = '0.0.0.0';

createServer()
  .then((app) => {
    // Wrap Express in an http.Server so Socket.io can attach to it
    const httpServer = createHttpServer(app);

    // Initialise Socket.io on the same port
    initSocket(httpServer);

    startCleanupJobs();

    httpServer.listen(port, host, () => {
      console.log(`API + WebSocket listening on http://${host}:${port}`);
    });

    // Graceful shutdown pour Render
    const shutdown = (signal: string) => {
      console.log(`Received ${signal}, closing server...`);
      httpServer.close(() => {
        console.log('Server closed successfully.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });


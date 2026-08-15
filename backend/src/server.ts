import { createServer as createHttpServer } from 'http';
import { createServer } from './app.js';
import { initSocket } from './lib/socket.js';
import { startCleanupJobs } from './jobs/cleanup.js';

const port = Number(process.env.PORT ?? 4000);

createServer()
  .then((app) => {
    // Wrap Express in an http.Server so Socket.io can attach to it
    const httpServer = createHttpServer(app);

    // Initialise Socket.io on the same port
    initSocket(httpServer);

    startCleanupJobs();

    httpServer.listen(port, () => {
      console.log(`API + WebSocket listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });

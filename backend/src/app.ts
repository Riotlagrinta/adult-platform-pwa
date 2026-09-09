import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { uploadRoot } from './lib/storage.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { verificationRouter } from './routes/verification.js';
import { socialRouter } from './routes/social.js';
import { messageRouter } from './routes/messages.js';
import { usersRouter } from './routes/users.js';
import { notificationRouter } from './routes/notifications.js';
import { reportRouter } from './routes/reports.js';
import { adminRouter } from './routes/admin.js';
import { filesRouter } from './routes/files.js';
import { blocksRouter } from './routes/blocks.js';
import { storiesRouter } from './routes/stories.js';
import { pushRouter } from './routes/push.js';
import { groupsRouter } from './routes/groups.js';
import { errorHandler } from './middleware/error-handler.js';


export async function createServer() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  const explicitOrigins = (process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'https://onlyadults-frontend.vercel.app'])
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (
          explicitOrigins.includes(normalized) ||
          normalized.endsWith('.vercel.app') ||
          normalized.includes('localhost') ||
          normalized.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      next();
    },
    express.static(uploadRoot, {
      fallthrough: false,
      maxAge: '7d',
      immutable: false,
      setHeaders: (res, filePath) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Accept-Ranges', 'bytes');
        const lower = filePath.toLowerCase();
        if (lower.endsWith('.webm')) {
          res.setHeader('Content-Type', 'audio/webm');
        } else if (lower.endsWith('.mp4') || lower.endsWith('.m4a')) {
          res.setHeader('Content-Type', 'audio/mp4');
        } else if (lower.endsWith('.ogg') || lower.endsWith('.opus')) {
          res.setHeader('Content-Type', 'audio/ogg');
        } else if (lower.endsWith('.aac')) {
          res.setHeader('Content-Type', 'audio/aac');
        } else if (lower.endsWith('.mp3')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        } else if (lower.endsWith('.wav')) {
          res.setHeader('Content-Type', 'audio/wav');
        }
      },
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'adult-platform-backend' });
  });

  app.use('/auth', authRouter);
  app.use('/profile', profileRouter);
  app.use('/verification', verificationRouter);
  app.use('/social', socialRouter);
  app.use('/users', usersRouter);
  app.use('/notifications', notificationRouter);
  app.use('/reports', reportRouter);
  app.use('/admin', adminRouter);
  app.use('/files', filesRouter);
  app.use('/messages', messageRouter);
  app.use('/blocks', blocksRouter);
  app.use('/stories', storiesRouter);
  app.use('/push', pushRouter);
  app.use('/groups', groupsRouter);

  app.use(errorHandler);

  return app;
}

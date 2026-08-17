import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { uploadRoot } from './lib/storage.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { verificationRouter } from './routes/verification.js';
import { postRouter } from './routes/posts.js';
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
import { errorHandler } from './middleware/error-handler.js';


export async function createServer() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));
  app.use('/uploads', express.static(uploadRoot, {
    fallthrough: false,
    maxAge: '7d',
    immutable: false,
  }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'adult-platform-backend' });
  });

  app.use('/auth', authRouter);
  app.use('/profile', profileRouter);
  app.use('/verification', verificationRouter);
  app.use('/posts', postRouter);
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

  app.use(errorHandler);

  return app;
}

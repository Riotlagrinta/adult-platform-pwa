import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { createNotification } from '../lib/notifications.js';
import type { MediaInput } from '../lib/media.js';
import { signUrlIfNeeded } from '../lib/storage-online.js';

export const postRouter = Router();

const mediaSchema = z.object({
  kind: z.enum(['IMAGE', 'VIDEO']),
  url: z.string().regex(/^(https?:\/\/|\/uploads\/)/, "L'URL ou le chemin du média est invalide"),
  mimeType: z.string().min(3),
  durationSeconds: z.number().int().positive().optional(),
  allowDownload: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
});

postRouter.get('/', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const authorId = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { verificationStatus: true },
    });

    const following = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      select: { followingId: true },
    });
    const followingIds = new Set(following.map((entry: { followingId: string }) => entry.followingId));

    const posts = await prisma.post.findMany({
      where: authorId ? { authorId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true } },
        likes: true,
        comments: { include: { author: { select: { id: true, displayName: true, avatarUrl: true } } } },
        media: true,
      },
    });

    const filteredPosts = posts.filter((post: { authorId: string; visibility: 'PUBLIC' | 'FOLLOWERS' | 'VERIFIED_ONLY' }) => {
      if (post.authorId === req.user!.id) {
        return true;
      }

      if (post.visibility === 'PUBLIC') {
        return true;
      }

      if (post.visibility === 'FOLLOWERS') {
        return followingIds.has(post.authorId);
      }

      return currentUser?.verificationStatus === 'APPROVED';
    });

    // Pré-signer à la volée les URLs de médias stockées dans Scaleway
    const signedPosts = await Promise.all(
      filteredPosts.map(async (post) => {
        const signedMedia = await Promise.all(
          post.media.map(async (med) => ({
            ...med,
            url: (await signUrlIfNeeded(med.url)) || med.url,
          }))
        );
        return {
          ...post,
          media: signedMedia,
        };
      })
    );

    res.json({ posts: signedPosts });
  } catch (error) {
    next(error);
  }
});

postRouter.get('/reels', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        media: {
          some: {
            kind: 'VIDEO',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true } },
        likes: true,
        comments: { include: { author: { select: { id: true, displayName: true, avatarUrl: true } } } },
        media: true,
      },
    });

    const signedPosts = await Promise.all(
      posts.map(async (post) => {
        const signedMedia = await Promise.all(
          post.media.map(async (med) => ({
            ...med,
            url: (await signUrlIfNeeded(med.url)) || med.url,
          }))
        );
        return {
          ...post,
          media: signedMedia,
        };
      })
    );

    res.json({ posts: signedPosts });
  } catch (error) {
    next(error);
  }
});

postRouter.post('/', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const schema = z.object({
      caption: z.string().max(2000).optional(),
      visibility: z.enum(['PUBLIC', 'FOLLOWERS', 'VERIFIED_ONLY']).default('PUBLIC'),
      media: z.union([mediaSchema, z.array(mediaSchema).max(10)]).optional(),
    });
    const data = schema.parse(req.body);
    const mediaItems = data.media ? (Array.isArray(data.media) ? data.media : [data.media]) : [];

    const post = await prisma.post.create({
      data: {
        authorId: req.user!.id,
        caption: data.caption,
        visibility: data.visibility,
        media: mediaItems.length ? {
          create: mediaItems.map((item: MediaInput) => ({
            kind: item.kind,
            url: item.url,
            mimeType: item.mimeType,
            durationSeconds: item.durationSeconds,
            allowDownload: item.allowDownload,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
          })),
        } : undefined,
      },
      include: { media: true },
    });

    // Pré-signer les URLs du post créé
    const postWithSignedMedia = {
      ...post,
      media: await Promise.all(
        post.media.map(async (med) => ({
          ...med,
          url: (await signUrlIfNeeded(med.url)) || med.url,
        }))
      ),
    };

    res.status(201).json({ post: postWithSignedMedia });
  } catch (error) {
    next(error);
  }
});

postRouter.post('/:id/like', requireAuth, requireApproved, async (req, res, next) => {
  try {
    await prisma.postLike.upsert({
      where: { postId_userId: { postId: String(req.params.id), userId: req.user!.id } },
      create: { postId: String(req.params.id), userId: req.user!.id },
      update: {},
    });

    const post = await prisma.post.findUnique({
      where: { id: String(req.params.id) },
      select: { authorId: true },
    });

    if (post && post.authorId !== req.user!.id) {
      await createNotification({
        userId: post.authorId,
        type: 'post.liked',
        title: 'Publication aimée',
        body: 'Un utilisateur a aimé votre publication.',
        data: { postId: String(req.params.id), userId: req.user!.id },
      });
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

postRouter.delete('/:id/like', requireAuth, requireApproved, async (req, res, next) => {
  try {
    await prisma.postLike.delete({
      where: { postId_userId: { postId: String(req.params.id), userId: req.user!.id } },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

postRouter.post('/:id/comments', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const schema = z.object({ content: z.string().min(1).max(1000) });
    const data = schema.parse(req.body);
    const comment = await prisma.comment.create({
      data: {
        postId: String(req.params.id),
        authorId: req.user!.id,
        content: data.content,
      },
    });

    const post = await prisma.post.findUnique({
      where: { id: String(req.params.id) },
      select: { authorId: true },
    });

    if (post && post.authorId !== req.user!.id) {
      await createNotification({
        userId: post.authorId,
        type: 'post.commented',
        title: 'Nouveau commentaire',
        body: 'Un utilisateur a commenté votre publication.',
        data: { postId: String(req.params.id), commentId: comment.id },
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
});

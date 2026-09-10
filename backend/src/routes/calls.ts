import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { signUrlIfNeeded } from '../lib/storage-online.js';

export const callsRouter = Router();

// Historique des appels (passés, reçus, manqués) de l'utilisateur connecté
callsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const calls = await prisma.callLog.findMany({
      where: { OR: [{ callerId: userId }, { calleeId: userId }] },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        caller: { select: { id: true, displayName: true, avatarUrl: true } },
        callee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    const signedCalls = await Promise.all(
      calls.map(async (call) => {
        const isOutgoing = call.callerId === userId;
        const partner = isOutgoing ? call.callee : call.caller;
        return {
          id: call.id,
          isOutgoing,
          isVideo: call.isVideo,
          status: call.status,
          startedAt: call.startedAt,
          connectedAt: call.connectedAt,
          endedAt: call.endedAt,
          durationSeconds: call.durationSeconds,
          partner: { ...partner, avatarUrl: await signUrlIfNeeded(partner.avatarUrl) },
        };
      })
    );

    res.json({ calls: signedCalls });
  } catch (error) {
    next(error);
  }
});

export default callsRouter;

import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function requireApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { verificationStatus: true },
  });

  if (!user || user.verificationStatus !== 'APPROVED') {
    return res.status(403).json({ error: 'Account not approved' });
  }

  next();
}


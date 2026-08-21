import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[Error Handler]', err);

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(', ');
    return res.status(400).json({ error: message || 'Données fournies invalides' });
  }

  if (err instanceof Error) {
    return res.status(500).json({ error: err.message || 'Erreur interne du serveur' });
  }

  res.status(500).json({ error: 'Erreur interne du serveur' });
}


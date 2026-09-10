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
    // Ne jamais renvoyer err.message au client : il peut contenir des détails internes
    // (chemins serveur, requêtes Prisma, erreurs AWS/S3...). Il reste loggé côté serveur ci-dessus.
    const message = process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message;
    return res.status(500).json({ error: message || 'Erreur interne du serveur' });
  }

  res.status(500).json({ error: 'Erreur interne du serveur' });
}


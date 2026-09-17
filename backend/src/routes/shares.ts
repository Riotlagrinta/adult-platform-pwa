import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { serializeFileShare } from '../lib/shares.js';

export const sharesRouter = Router();

const MAX_ACTIVE_SHARES_PER_USER = 10;

// Première fonctionnalité du backend à nécessiter du rate-limiting : la création de
// partage ouvre un nouvel espace d'abus (annonces de tracker, entrées en base) qui
// n'existait pas avant (le serveur ne stockant jamais les octets, le vrai coût à
// contenir ici est le nombre de partages/lignes créés, pas la bande passante).
const createShareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
});

const heartbeatLimiter = rateLimit({
  windowMs: 20 * 1000,
  limit: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
});

const createShareSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  infoHash: z.string().regex(/^[a-f0-9]{40}$/i, 'infoHash invalide'),
  magnetUri: z.string().trim().min(20).max(10000).startsWith('magnet:?', 'magnetUri invalide'),
  totalSizeBytes: z.string().regex(/^\d+$/, 'totalSizeBytes doit être un entier positif'),
  fileCount: z.number().int().positive().max(5000),
  manifest: z
    .array(
      z.object({
        path: z.string().min(1).max(1000),
        size: z.number().nonnegative(),
      })
    )
    .min(1)
    .max(5000),
});

// Créer un partage : appelé une fois que le client a démarré le seed WebTorrent et
// obtenu un magnetUri/infoHash. Le serveur ne voit jamais les octets du fichier.
//
// L'infoHash dépend uniquement du contenu : rouvrir l'onglet et relancer le seed du
// même dossier (rechargement de page, nouvel essai après une coupure...) régénère
// exactement le même infoHash. `infoHash` reste unique globalement en base (pas de
// changement de schéma) — un re-partage par le MÊME propriétaire réactive donc
// l'enregistrement existant au lieu de planter sur la contrainte ; un partage du même
// contenu par un propriétaire DIFFÉRENT (rare mais possible) renvoie une erreur claire
// plutôt qu'un 500 générique.
sharesRouter.post('/', requireAuth, requireApproved, createShareLimiter, async (req, res, next) => {
  try {
    const data = createShareSchema.parse(req.body);
    const ownerId = req.user!.id;
    const infoHash = data.infoHash.toLowerCase();

    const existing = await prisma.fileShare.findUnique({ where: { infoHash } });

    if (existing && existing.ownerId !== ownerId) {
      return res.status(409).json({
        error: 'Ce contenu est déjà partagé par un autre utilisateur sur la plateforme.',
      });
    }

    if (!existing) {
      const activeCount = await prisma.fileShare.count({
        where: { ownerId, status: 'ACTIVE' },
      });
      if (activeCount >= MAX_ACTIVE_SHARES_PER_USER) {
        return res.status(429).json({
          error: `Limite de ${MAX_ACTIVE_SHARES_PER_USER} partages actifs simultanés atteinte. Arrêtez-en un avant d'en créer un nouveau.`,
        });
      }
    }

    const fields = {
      title: data.title,
      description: data.description,
      magnetUri: data.magnetUri,
      totalSizeBytes: BigInt(data.totalSizeBytes),
      fileCount: data.fileCount,
      manifest: data.manifest,
      status: 'ACTIVE' as const,
      lastSeenActiveAt: new Date(),
    };

    const share = existing
      ? await prisma.fileShare.update({ where: { infoHash }, data: fields })
      : await prisma.fileShare.create({ data: { ownerId, infoHash, ...fields } });

    res.status(existing ? 200 : 201).json({ share: serializeFileShare(share) });
  } catch (error) {
    next(error);
  }
});

// Liste des partages de l'utilisateur connecté ("Mes partages").
sharesRouter.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const shares = await prisma.fileShare.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ shares: shares.map(serializeFileShare) });
  } catch (error) {
    next(error);
  }
});

// Métadonnées d'un partage pour qui ouvre le lien — n'importe quel utilisateur
// authentifié et approuvé, pas seulement le propriétaire (le partage n'est accessible
// qu'à qui possède le lien, mais tout compte de la plateforme peut l'ouvrir).
sharesRouter.get('/:id', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const share = await prisma.fileShare.findUnique({
      where: { id: String(req.params.id) },
      include: { owner: { select: { id: true, displayName: true, avatarUrl: true } } },
    });

    if (!share) {
      return res.status(404).json({ error: 'Partage introuvable.' });
    }
    if (share.status === 'STOPPED') {
      return res.status(410).json({ error: 'Ce partage a été arrêté par son propriétaire.' });
    }

    res.json({ share: serializeFileShare(share) });
  } catch (error) {
    next(error);
  }
});

// Le propriétaire signale qu'il seed toujours (garde le partage ACTIVE).
sharesRouter.post('/:id/heartbeat', requireAuth, heartbeatLimiter, async (req, res, next) => {
  try {
    const share = await prisma.fileShare.findUnique({ where: { id: String(req.params.id) } });
    if (!share || share.ownerId !== req.user!.id) {
      return res.status(404).json({ error: 'Partage introuvable.' });
    }
    if (share.status === 'STOPPED') {
      return res.status(410).json({ error: 'Ce partage a été arrêté.' });
    }

    const updated = await prisma.fileShare.update({
      where: { id: share.id },
      data: { status: 'ACTIVE', lastSeenActiveAt: new Date() },
    });

    res.json({ share: serializeFileShare(updated) });
  } catch (error) {
    next(error);
  }
});

// Arrêt du partage par son propriétaire (soft-delete : conserve l'historique dans
// "mes partages" plutôt que de supprimer la ligne immédiatement).
sharesRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const share = await prisma.fileShare.findUnique({ where: { id: String(req.params.id) } });
    if (!share || share.ownerId !== req.user!.id) {
      return res.status(404).json({ error: 'Partage introuvable.' });
    }

    const updated = await prisma.fileShare.update({
      where: { id: share.id },
      data: { status: 'STOPPED' },
    });

    res.json({ share: serializeFileShare(updated) });
  } catch (error) {
    next(error);
  }
});

export default sharesRouter;

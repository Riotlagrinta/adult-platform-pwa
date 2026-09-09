import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getVapidPublicKey, isPushConfigured, sendPushNotification } from '../lib/push.js';

export const pushRouter = Router();

// Récupérer la clé publique VAPID pour initialiser l'abonnement côté navigateur
pushRouter.get('/public-key', (_req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({ publicKey });
});

// Enregistrer un nouvel abonnement Push
pushRouter.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }),
    });

    const data = schema.parse(req.body);

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId: req.user!.id,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
      },
      update: {
        userId: req.user!.id,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
      },
    });

    res.status(201).json({ ok: true, subscriptionId: subscription.id });
  } catch (error) {
    next(error);
  }
});

// Supprimer un abonnement Push (Désactivation par l'utilisateur)
pushRouter.post('/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      endpoint: z.string().url(),
    });

    const data = schema.parse(req.body);

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: data.endpoint,
        userId: req.user!.id,
      },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Tester l'envoi d'une notification push sur l'appareil de l'utilisateur connecté
pushRouter.post('/test', requireAuth, async (req, res, next) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ error: 'Les clés VAPID ne sont pas configurées sur le serveur.' });
    }

    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId: req.user!.id },
    });
    if (subscriptionCount === 0) {
      return res.status(409).json({ error: 'Aucun appareil n’est enregistré pour les notifications push.' });
    }

    await sendPushNotification(req.user!.id, {
      title: 'OnlyAdults 🔔',
      body: 'Les notifications Web Push sont parfaitement actives sur votre appareil !',
      url: '/',
    });

    res.json({ ok: true, message: 'Notification test envoyée.', subscriptionCount });
  } catch (error) {
    next(error);
  }
});

# Backend

Backend API de la plateforme PWA.

Contrat API: [docs/api-contract.md](./docs/api-contract.md)

## Stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT

## Démarrage local

1. Copier `.env.example` vers `.env`
2. Lancer PostgreSQL
3. Installer les dépendances
4. Générer Prisma
5. Lancer les migrations
6. Démarrer l'API

## Variables clés

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

## Endpoints de base

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /profile/me`
- `PATCH /profile/me`
- `POST /verification/request`
- `GET /verification/queue`
- `POST /verification/:id/review`
- `GET /posts`
- `POST /posts`
- `POST /posts/:id/like`
- `DELETE /posts/:id/like`
- `POST /posts/:id/comments`
- `POST /social/:userId/follow`
- `DELETE /social/:userId/follow`
- `GET /social/feed`
- `GET /messages/conversations`
- `POST /messages/conversations/:userId`
- `POST /messages/conversations/:conversationId/messages`
- `GET /users/search`
- `GET /users/:userId`
- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /reports`
- `GET /reports/mine`
- `GET /admin/summary`
- `GET /admin/reports`
- `POST /files/avatar`
- `POST /files/media`
- `POST /files/verification`
- `DELETE /files/delete?path=/uploads/...`

## Upload local

Les fichiers sont stockés localement dans `backend/uploads/` en développement et dans le volume Docker monté sur `/app/uploads` en conteneur.

Les URLs retournées par l'API sont servies publiquement sous `/uploads/...`.

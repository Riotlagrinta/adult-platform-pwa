# Démarrage de la Plateforme OnlyAdults

Ce document explique comment démarrer la base de données, le backend et le frontend du projet en développement.

---

## Option 1 : Démarrage rapide avec Docker (Recommandé pour la Base de Données & le Backend)

Vous pouvez lancer la base de données PostgreSQL et le serveur backend en une seule commande grâce à Docker Compose.

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré.

### Lancement
1. **Démarrer les services** à la racine du projet :
   ```bash
   docker-compose up --build
   ```
   Cela va compiler le backend, initialiser la base de données PostgreSQL, appliquer le schéma Prisma, et lancer le serveur API sur le port **4000**.

2. **Arrêter les services** :
   ```bash
   docker-compose down
   ```

---

## Option 2 : Lancement manuel des serveurs (Développement local)

Si vous préférez exécuter les composants directement sur votre machine locale.

### 1. Base de données PostgreSQL
Assurez-vous d'avoir une instance PostgreSQL en cours d'exécution locale ou via Docker, et récupérez son URI de connexion.

### 2. Démarrer le Backend

1. **Naviguer dans le dossier backend** :
   ```bash
   cd backend
   ```
2. **Configurer l'environnement** :
   Copiez le fichier d'exemple et renseignez vos variables (ex: mot de passe de base de données) :
   ```bash
   cp .env.example .env
   ```
3. **Installer les dépendances** :
   ```bash
   npm install
   ```
4. **Générer le client Prisma & synchroniser le schéma** :
   ```bash
   npm run prisma:generate
   npx prisma db push
   ```
5. **Démarrer le serveur API** (port **4000**) :
   ```bash
   npm run dev
   ```

### 3. Démarrer le Frontend (PWA)

1. **Naviguer dans le dossier frontend** :
   ```bash
   cd frontend
   ```
2. **Installer les dépendances** :
   ```bash
   npm install
   ```
3. **Démarrer le serveur Next.js** (port **3000**) :
   ```bash
   npm run dev
   ```

---

## Liens Utiles en Local

- **Frontend (Interface PWA OnlyAdults)** : [http://localhost:3000](http://localhost:3000)
- **API Backend (REST + WebSocket)** : [http://localhost:4000](http://localhost:4000)
- **Prisma Studio (Visualiseur de base de données)** :
  ```bash
  cd backend
  npm run prisma:studio
  ```

---

## Temps Réel (Socket.io)

Le backend intègre un serveur **Socket.io** sur le **même port** que l'API REST (4000).

### Événements disponibles

| Événement | Direction | Description |
|---|---|---|
| `message:send` | Client → Serveur | Envoyer un message dans une conversation |
| `message:new` | Serveur → Client | Nouveau message reçu |
| `typing:start` | Client → Serveur | L'utilisateur commence à taper |
| `typing:stop` | Client → Serveur | L'utilisateur arrête de taper |
| `typing:update` | Serveur → Client | Notification de frappe |
| `notification:new` | Serveur → Client | Nouvelle notification (like, commentaire, follow) |
| `user:online` | Serveur → Client | Un utilisateur se connecte |
| `user:offline` | Serveur → Client | Un utilisateur se déconnecte |

### Authentification WebSocket

Le token JWT doit être passé lors du handshake :
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: 'votre_jwt_ici' }
});
```


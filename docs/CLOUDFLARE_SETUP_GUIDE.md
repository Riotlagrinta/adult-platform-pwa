# Guide de Déploiement : Cloudflare Workers Gratuit (*.workers.dev)

Ce guide vous explique pas-à-pas comment déployer les deux Workers Cloudflare pour **OnlyAdults** sans aucun nom de domaine payant, 100% gratuitement.

---

## ⚡ Étape 1 : Créer votre compte Cloudflare (si ce n'est pas déjà fait)
1. Rendez-vous sur [dash.cloudflare.com](https://dash.cloudflare.com) et créez un compte gratuit.
2. Choisissez votre sous-domaine `workers.dev` gratuit lors de la première utilisation (ex: `moncompte.workers.dev`).

---

## 🚀 Étape 2 : Déployer le CDN Médias Backblaze B2 (Media CDN Worker)
Ce worker sert de façade ultra-rapide devant votre stockage Backblaze B2 avec 0€ de frais de transfert.

1. Dans le menu de gauche de Cloudflare, cliquez sur **Workers & Pages** (ou **Compute**).
2. Cliquez sur le bouton bleu **Create Application** puis **Create Worker**.
3. Donnez un nom au worker : `onlyadults-media` puis cliquez sur **Deploy**.
4. Cliquez ensuite sur **Edit code**.
5. Supprimez tout le code existant et collez l'intégralité du contenu du fichier :
   👉 `cloudflare/media-cdn-worker.js`
6. *(Optionnel)* Vérifiez que `originEndpoint` et `bucketName` correspondent bien à votre bucket Backblaze B2 (`https://s3.us-east-005.backblazeb2.com` et `Only-Adult`).
7. Cliquez sur **Deploy** en haut à droite.
8. Votre URL CDN est prête ! Elle ressemble à :
   `https://onlyadults-media.<votre-sous-domaine>.workers.dev`

### 🔧 Activer l'URL CDN dans votre backend Render :
Sur votre tableau de bord **Render** (Environment Variables de votre API) :
* Ajoutez la variable :
  `CLOUDFLARE_CDN_URL` = `https://onlyadults-media.<votre-sous-domaine>.workers.dev`
* Sauvegardez : Render redémarre et distribuera désormais tous les médias via le CDN mondial Cloudflare.

---

## ⏰ Étape 3 : Déployer le Maintien en Éveil Render 24/7 (Keep-Alive Worker)
Ce worker envoie un signal automatique toutes les 10 minutes sur Render pour qu'il ne s'endorme **JAMAIS**.

1. Toujours dans **Workers & Pages**, cliquez sur **Create Application** > **Create Worker**.
2. Nommez-le : `onlyadults-keepalive` puis cliquez sur **Deploy**.
3. Cliquez sur **Edit code**.
4. Supprimez le code par défaut et collez l'intégralité du fichier :
   👉 `cloudflare/render-keepalive.js`
5. Vérifiez la ligne `RENDER_HEALTH_URL` pour y mettre l'URL de votre API Render (ex: `https://onlyadults-backend.onrender.com/health`).
6. Cliquez sur **Deploy**.

### ⏱️ Activer le déclencheur Cron (Toutes les 10 minutes) :
1. Sur la page de votre worker `onlyadults-keepalive`, allez dans l'onglet **Settings** > **Triggers** (Déclencheurs).
2. Dans la section **Cron Triggers**, cliquez sur **Add Trigger**.
3. Entrez l'expression Cron :
   `*/10 * * * *` *(signifie toutes les 10 minutes)*
4. Cliquez sur **Add Trigger**.

🎉 **C'est terminé !** Votre serveur Render ne s'endormira plus jamais, et tous vos fichiers vidéos, photos et vocaux seront accélérés gratuitement par le réseau mondial de Cloudflare.

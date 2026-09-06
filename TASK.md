# Feuille de Route - Only Adult (PWA Ultime & APK Android)

---

## 🎯 Objectif Stratégique

1. **Phase 1 (Priorité Immédiate)** : Pousser la **PWA (Progressive Web App)** à son niveau maximal afin d'offrir une expérience utilisateur 100% indiscernable d'une application native sur **iOS (iPhone/iPad)** et **Android/Desktop**.
2. **Phase 2 (Extension Mobile)** : Construire un **APK Android dédié** (via Capacitor ou Expo/React Native) téléchargeable directement sur le site web pour les utilisateurs Android désireux d'une application installable hors store.

---

## 📋 Phase 1 : Pousser la PWA à son Niveau Maximal (PWA "Super-Native")

### 1. Expérience Visuelle & Intégration Matérielle (Mobile-First)
- [ ] **Gestion parfaite des Safe Areas (Encoche & Dynamic Island)** :
  - Intégrer `viewport-fit=cover` et les variables CSS `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`.
  - Fixer la barre de navigation inférieure et l'en-tête pour qu'ils épousent le bas et le haut de l'écran des iPhone.
- [ ] **Splash Screens iOS & Icônes Haute Résolution** :
  - Générer les splash screens natifs pour toutes les résolutions d'iPhone (`apple-touch-startup-image`).
  - Configurer `apple-mobile-web-app-status-bar-style: black-translucent`.
- [ ] **Guidage d'installation intelligent (Smart Install Prompt)** :
  - **Sur iOS** : Afficher une modale interactive expliquant clairement en 2 étapes visuelles comment ajouter l'app à l'écran d'accueil (Bouton Partager ⎋ ➔ « Sur l'écran d'accueil » ⊕).
  - **Sur Android** : Déclencher le prompt natif `beforeinstallprompt` via un bouton « Installer l'application ».

### 2. Gestes & Ergonomie 100% Native
- [ ] **Retours Haptiques (Vibrations tactiles)** :
  - Déclencher de légères micro-vibrations (`navigator.vibrate`) sur les likes, messages envoyés, enregistrement vocal et actions sensibles.
- [ ] **Gestes Tactiles Fluides** :
  - Support du swipe pour revenir en arrière (*Swipe to go back*).
  - Pull-to-refresh animé et fluide sans rechargement brutal de la page.
  - Prévention des rebonds de scroll indésirables d'iOS (`overscroll-behavior-y: contain`).
- [ ] **Transitions de Pages Ultra-Rapides** :
  - Micro-animations et transitions de routes sans écran blanc (Next.js App Router + Framer Motion / View Transitions API).

### 3. Fonctionnalités Hors-Ligne & Notifications
- [ ] **Service Worker & Cache Hors-Ligne** :
  - Mise en cache des assets statiques, polices et flux pour un chargement instantané en 0 seconde.
  - Page dédiée élégante en cas de perte de connexion internet.
- [ ] **Notifications Push Web sur iOS & Android** :
  - Activer et optimiser les notifications Web Push VAPID (fonctionnelles sur iOS 16.4+ une fois installée sur l'écran d'accueil).
  - Badges de notifications dynamiques sur l'icône de l'écran d'accueil (`navigator.setAppBadge`).

---

## 📱 Phase 2 : Construction de l'APK Android Dédié

- [ ] **Choix de l'architecture pour l'APK** :
  - *Option A (Capacitor)* : Conteneur natif ultra-performant autour du frontend Next.js, permettant de compiler un APK instantanément avec toutes les APIs natives Android.
  - *Option B (React Native / Expo)* : Client mobile autonome connecté à l'API Node.js et Socket.io.
- [ ] **Génération & Signature de l'APK Release** :
  - Configuration du build Android (Keystore, permissions caméra/micro/stockage).
  - Bouton de téléchargement direct de l'APK sur la page d'accueil ou dans les paramètres du profil (« Télécharger l'application Android »).
- [ ] **Auto-Update In-App (APK)** :
  - Mécanisme de notification de mise à jour dans l'APK lorsque une nouvelle version est disponible.

---

## 📊 Suivi & Validation Qualité
- [x] Diagnostic et correction du lecteur vocal `VoicePlayer.tsx`
- [x] Optimisation de l'enregistrement audio multi-codecs `messages/page.tsx`
- [x] Zéro erreur TypeScript sur le backend et le frontend
- [ ] Audit Lighthouse PWA (Score visé : 100/100)
- [ ] Tests physiques sur iPhone (Safari PWA) et Android (Chrome PWA + APK)

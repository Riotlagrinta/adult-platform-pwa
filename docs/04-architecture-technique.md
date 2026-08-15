# Architecture Technique

## Vue d'ensemble

Architecture simple pour démarrer rapidement:

- front-end PWA
- API backend
- base de données
- stockage de fichiers
- panneau administrateur

## Front-end

- framework web moderne
- interface mobile-first
- support offline partiel
- installation PWA

## Backend

- authentification
- gestion des profils
- workflow de vérification
- messagerie privée
- modération
- notifications
- flux de publications
- likes
- commentaires
- abonnements / followers
- gestion des médias temporaires

## Base de données

Tables de départ suggérées:

- users
- profiles
- verification_requests
- messages
- conversations
- reports
- admin_actions
- notifications
- posts
- follows
- post_likes
- post_comments
- media_expirations

## Sécurité

- validation côté serveur
- contrôle d'accès par rôle
- chiffrement des données sensibles au repos si possible
- journalisation des actions sensibles
- limitation de débit sur les endpoints critiques

## Point important sur les captures d'écran

Une PWA web ne peut pas empêcher totalement les captures d'écran ni garantir la détection fiable d'une capture. Le projet doit donc prévoir des mesures de réduction du risque:

- filigrane dynamique
- contenus sensibles affichés temporairement
- masquage partiel des données
- blocage du téléchargement direct
- journalisation des accès
- alerte contextuelle si le système peut observer un événement suspect

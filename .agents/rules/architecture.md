# Décisions d'Architecture - OnlyAdults

Ce document répertorie les choix d'architecture technique validés pour la plateforme.

## 1. Stockage de fichiers (Médias éphémères & Profils)
* **Production :** Utilisation de **Scaleway Object Storage** (compatible AWS S3).
* **Développement / Tests :** Stockage local temporaire géré via `multer` (les fichiers sont enregistrés sur le serveur principal).
* **Objectif de migration :** Dès la fin des tests de la phase MVP, le backend devra être migré pour envoyer directement les fichiers sur le bucket Scaleway et générer des URLs pré-signées sécurisées avec une expiration dynamique de 5 minutes.

## 2. Infrastructure de base de données
* **PostgreSQL (PostGIS) :** Moteur hébergé sur le port **5434** en environnement de développement local (afin d'éviter les conflits de ports avec d'autres conteneurs de bases de données actifs, notamment le projet Voyago sur le port 5432).

## 3. Communication & Langue
* **Règle stricte :** Toutes les interactions, planifications et réponses de l'assistant de programmation s'effectuent exclusivement en français.

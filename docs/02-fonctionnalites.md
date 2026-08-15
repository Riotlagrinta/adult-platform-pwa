# Fonctionnalités

## Côté utilisateur

- création de compte
- connexion / déconnexion
- édition du profil
- ajout de photo de profil
- dépôt de demande de vérification
- consultation du statut de vérification
- recherche de profils approuvés
- ouverture de conversation privée
- envoi de messages
- envoi de photos et vidéos avec durée de visibilité réglable
- option d'autoriser ou d'interdire l'enregistrement par le destinataire
- blocage d'un utilisateur
- signalement d'un comportement abusif
- fil d'actualité avec publications
- suivi d'autres profils
- likes sur les publications
- commentaires sur les publications

## Côté administrateur

- consultation des demandes en attente
- visualisation des pièces fournies
- acceptation ou refus d'une demande
- suspension d'un compte
- suppression d'un compte
- consultation des signalements
- gestion des profils mis en avant

## Fonctions PWA

- installation sur écran d'accueil
- mise en cache des ressources utiles
- chargement rapide sur réseau faible
- notifications push

## Médias temporaires

Le système de discussion doit permettre d'envoyer des médias avec un comportement inspiré des messages éphémères:

- durée de lecture définie avant l'envoi
- visibilité limitée après ouverture
- paramètre d'enregistrement autorisé ou interdit
- journalisation des ouvertures et interactions

## Détection de capture

La plateforme peut tenter de détecter ou d'inférer certaines captures d'écran selon le contexte technique, mais sur une PWA web cette protection ne sera jamais fiable à 100 pour cent.

Approche recommandée:

- afficher un avertissement si une capture est suspectée
- ajouter des filigranes dynamiques
- limiter l'accès aux médias sensibles dans le temps
- restreindre les options de téléchargement direct

## Fonctions à prévoir plus tard

- paiement et abonnement
- contenus réservés
- filtres avancés
- recommandations
- vérification automatique d'identité
- système anti-spam renforcé

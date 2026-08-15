# Adult Platform PWA

Plateforme web progressive destinée à des adultes vérifiés, avec profils privés, messagerie privée, médias temporaires, et un fil social avec abonnements, likes et commentaires.

## Objectif

Construire une application web mobile-first, installable comme PWA, centrée sur:

- l'inscription d'adultes uniquement
- la vérification manuelle des comptes par administrateurs
- la mise en relation entre profils approuvés
- la messagerie privée
- l'envoi de photos et vidéos éphémères
- un fil de publications avec followers, likes et commentaires
- une expérience discrète, simple et rapide sur téléphone

## Cadre du projet

Ce projet doit rester dans un cadre légal et consenti:

- utilisateurs majeurs uniquement
- validation d'identité avant activation du compte
- modération des profils et des échanges
- signalement et blocage des comptes abusifs
- respect des lois applicables au Togo et des règles de paiement et d'hébergement

## Statut de la vérification d'identité

Dans la première version, la vérification d'identité sera faite manuellement par les administrateurs:

1. l'utilisateur crée un compte
2. il soumet ses informations et pièces justificatives
3. le compte reste en attente
4. un administrateur examine la demande
5. l'administrateur accepte ou refuse
6. le compte validé obtient l'accès complet

## Fonctionnalités MVP

- inscription / connexion
- profil utilisateur
- demande de vérification manuelle
- tableau de bord administrateur
- liste de profils approuvés
- recherche et filtres
- messagerie privée
- notification des messages
- signalement et blocage
- administration des comptes
- PWA installable sur mobile

## Structure du dépôt

```text
adult-platform-pwa/
├─ README.md
└─ docs/
   ├─ 01-cadrage-produit.md
   ├─ 02-fonctionnalites.md
   ├─ 03-verification-admin.md
   └─ 04-architecture-technique.md
```

## Prochaine étape

Créer l'ossature technique du projet:

- front-end PWA
- back-end API
- base de données
- espace administrateur
- workflow de validation

# Vérification Manuelle par Administrateurs

## Principe

La vérification d'identité est réalisée manuellement dans la première version du produit.

## Flux de validation

1. l'utilisateur soumet une demande
2. le système marque le compte comme `en attente`
3. un administrateur ouvre la file de vérification
4. l'administrateur vérifie les informations reçues
5. l'administrateur accepte ou refuse
6. le statut du compte est mis à jour

## Statuts recommandés

- `draft`
- `pending_review`
- `approved`
- `rejected`
- `suspended`

## Données à vérifier

- nom affiché
- date de naissance ou preuve de majorité
- photo ou document d'identité
- cohérence entre les informations du profil et les pièces fournies

## Règles internes

- aucun compte non vérifié ne peut accéder aux fonctions privées
- les comptes refusés doivent pouvoir redéposer une demande
- les actions d'administration doivent être journalisées
- les documents sensibles doivent être protégés

## Recommandations

- limiter l'accès aux pièces d'identité aux seuls administrateurs autorisés
- définir des délais de traitement clairs
- prévoir un motif de refus standardisé
- conserver un historique des décisions


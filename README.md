# GVIP — Rendez-vous colis Côte d'Ivoire ⇄ France


Site de prise de rendez-vous pour le dépôt et la récupération de colis
entre la Côte d'Ivoire et la France.

## Pages

| Route | Rôle |
|---|---|
| `/` | Espace client : réservation d'un créneau, suivi et modification du rendez-vous |
| `/Acceuil` | Page vitrine, formulaire « devenir partenaire », connexion |
| `/administrateurs` | Espace admin : gestion des compagnies de transport, suivi de l'activité |
| `/espace_partenaire` | Espace des compagnies partenaires |
| `/dashboard` | Tableau des risques (API FastAPI externe) |

## Stack

- React + Vite, déployé sur Vercel
- Firebase : Realtime Database, Auth, Storage
- Cloud Functions (`functions/`) : emails de notification via Gmail

## Démarrer en local

```bash
npm install
cp .env.example .env   # puis remplir les valeurs
npm run dev
```

Cloud Functions : remplir `functions/.env` (voir `functions/.env.example`),
puis `firebase deploy --only functions`. Voir aussi `SECURITE-ENV.md`.

Deployment Test 10:32PM
 

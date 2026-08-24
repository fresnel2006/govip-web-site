# Sécurisation des données sensibles — GVIP

## ⚠️ À faire en priorité : changer le mot de passe Gmail

Le mot de passe d'application Gmail (`GMAIL_APP_PASSWORD`) était écrit en dur
dans `functions/index.js`, et il est **déjà présent dans ton historique git**
(2 commits : `0657cec`, `bd28398`). Le retirer du fichier actuel ne l'efface
pas de l'historique.

➡️ Va sur https://myaccount.google.com/apppasswords, **révoque** l'ancien mot
de passe d'application, **génère-en un nouveau**, et mets-le dans
`functions/.env` (voir plus bas). Fais ça même si le dépôt est privé.

## Fichiers dans ce zip

```
.env                        → à mettre à la racine du projet
.env.example                → à mettre à la racine du projet (celui-ci PEUT aller sur git)
src/firebase/firebase.js    → remplace ton fichier actuel
functions/.env              → à mettre dans le dossier functions/
functions/.env.example      → à mettre dans le dossier functions/ (celui-ci PEUT aller sur git)
functions/index.js          → remplace ton fichier actuel
```

Ton `.gitignore` excluait déjà `.env` et `.env.local` — rien à changer de ce côté,
ces fichiers ne partiront jamais sur git.

## Ce qui a changé

**`src/firebase/firebase.js`** — la config Firebase (apiKey, projectId, etc.)
vient maintenant de `import.meta.env.VITE_FIREBASE_...`, avec un fallback qui
garde l'ancienne valeur en dur. Comme ça, si Vercel n'a pas ces variables
(et je n'y ai rien touché, comme demandé), ton déploiement actuel continue de
marcher pile comme avant. Le `.env` sert pour ton dev en local et pour le jour
où tu voudras nettoyer le fallback toi-même.

À noter : la config Firebase côté client (apiKey compris) n'est pas un secret
à proprement parler — Google la considère publique par design, la vraie
protection vient des règles de sécurité Realtime Database / Firestore. Ce
n'est pas ce qui présentait un risque ici.

**`functions/index.js`** — le mot de passe Gmail et l'email viennent
maintenant de `process.env.GMAIL_USER` / `process.env.GMAIL_APP_PASSWORD`,
**sans fallback** (contrairement au frontend). C'est voulu : ce fichier n'est
jamais déployé sur Vercel, seulement via `firebase deploy` — donc rien ne
casse ton déploiement Vercel. Firebase CLI charge automatiquement
`functions/.env` au déploiement et pour l'émulateur, aucune config
supplémentaire à faire.

## Vercel : rien à faire, comme demandé

Je n'ai créé aucune variable d'environnement dans Vercel. Le fallback dans
`firebase.js` garantit que ton déploiement actuel continue de fonctionner à
l'identique tant que tu n'y touches pas toi-même.

## Étapes

1. Change le mot de passe Gmail (voir en haut).
2. Colle `functions/.env` avec le nouveau mot de passe dans ton dossier `functions/`.
3. Colle `.env` à la racine du projet.
4. Remplace `src/firebase/firebase.js` et `functions/index.js` par les versions de ce zip.
5. Commit `.env.example` et `functions/.env.example` (pas les `.env`).
6. `firebase deploy --only functions` pour redéployer la fonction avec le nouveau mot de passe.

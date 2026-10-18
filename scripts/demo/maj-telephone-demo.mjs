// Ajoute le numero de la compagnie (telephoneCompagnie) aux departs de demo deja crees.
// Lancer depuis la racine du projet : node scripts/demo/maj-telephone-demo.mjs
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDatabase, ref, get, update, query, orderByChild, equalTo } from 'firebase/database';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*(VITE_FIREBASE_\w+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL, projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getDatabase(app);

const comptes = JSON.parse(readFileSync('scripts/demo/comptes-demo.json', 'utf8'));

for (const compte of comptes) {
    const { user } = await signInWithEmailAndPassword(auth, compte.email, compte.motDePasse);
    const telephone = (await get(ref(db, `partenaires/${user.uid}/telephone`))).val() || '';
    const snapshot = await get(query(ref(db, 'expeditions'), orderByChild('idPartenaire'), equalTo(user.uid)));
    const ids = Object.keys(snapshot.val() || {});
    for (const id of ids) {
        await update(ref(db, `expeditions/${id}`), { telephoneCompagnie: telephone });
    }
    console.log(`OK ${compte.nomEntreprise} : ${telephone} ajoute sur ${ids.length} departs`);
    await signOut(auth);
}

await deleteApp(app);
process.exit(0);

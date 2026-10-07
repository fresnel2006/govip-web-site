// Cree des compagnies + departs de DEMO dans Firebase (a supprimer avant la mise en ligne).
// Lancer depuis la racine du projet : node scripts/demo/creer-demo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDatabase, ref, set, push } from 'firebase/database';
import { getStorage, ref as sRef, uploadString, getDownloadURL } from 'firebase/storage';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*(VITE_FIREBASE_\w+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const config = {
    apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL, projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
};

const MOT_DE_PASSE = 'DemoGvip2026!';

function logoSvg(initiales, couleur1, couleur2, symbole) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${couleur1}"/><stop offset="1" stop-color="${couleur2}"/></linearGradient></defs>
<rect width="200" height="200" rx="40" fill="url(#g)"/>
${symbole}
<text x="100" y="168" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="2">${initiales}</text>
</svg>`;
}
const AVION = '<path d="M100 38 l10 30 h34 l8 10 -40 6 -6 30 12 8 -2 8 -16 -6 -16 6 -2 -8 12 -8 -6 -30 -40 -6 8 -10 h34z" fill="#fff" opacity=".95"/>';
const COLIS = '<path d="M60 60 l40 -18 40 18 v48 l-40 18 -40 -18z M60 60 l40 18 40 -18 M100 78 v48" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>';
const ARBRE = '<path d="M100 120 v-36 M100 92 l-22 -14 M100 86 l22 -16" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/><ellipse cx="100" cy="62" rx="44" ry="22" fill="#fff" opacity=".95"/>';

const COMPAGNIES = [
    {
        email: 'demo.sika@gvipcolis-demo.com', nom: 'Awa Koné', nomEntreprise: 'Sika Transport (DÉMO)',
        telephone: '+33 6 12 34 56 78', pays: 'France', adresse: '12 rue de la Chapelle, 75018 Paris', tarifParKilo: 8,
        description: "Spécialiste des envois Paris ⇄ Abidjan depuis 2015. Collecte à domicile en Île-de-France et suivi par WhatsApp.",
        logo: logoSvg('SIKA', '#1f7a3a', '#3fb56b', AVION),
        departs: [
            { paysDepart: 'France', villeDepart: 'Paris', paysArrivee: "Côte d'Ivoire", villeArrivee: 'Abidjan', date: '2026-10-10', heure: '08:00', frequence: 'hebdo', limiteKg: 23, tarifParKilo: 8, notes: 'Dépôt possible la veille au 12 rue de la Chapelle.' },
            { paysDepart: "Côte d'Ivoire", villeDepart: 'Abidjan', paysArrivee: 'France', villeArrivee: 'Paris', date: '2026-10-15', heure: '10:30', frequence: 'bimensuel', limiteKg: 30, tarifParKilo: 9, notes: '' },
        ],
    },
    {
        email: 'demo.ivoire@gvipcolis-demo.com', nom: 'Yao Kouassi', nomEntreprise: 'Ivoire Express Colis (DÉMO)',
        telephone: '+225 07 08 09 10 11', pays: "Côte d'Ivoire", adresse: 'Cocody Riviera 2, Abidjan', tarifParKilo: 7.5,
        description: "Transporteur ivoirien, départs réguliers vers Paris et Marseille. Emballage offert pour les colis de plus de 10 kg.",
        logo: logoSvg('IEC', '#e8771b', '#f4a742', COLIS),
        departs: [
            { paysDepart: "Côte d'Ivoire", villeDepart: 'Abidjan', paysArrivee: 'France', villeArrivee: 'Marseille', date: '2026-10-12', heure: '14:00', frequence: 'unique', limiteKg: 20, tarifParKilo: 7.5, notes: 'Pas de produits liquides.' },
            { paysDepart: "Côte d'Ivoire", villeDepart: 'Bouaké', paysArrivee: 'France', villeArrivee: 'Paris', date: '2026-10-20', heure: '09:00', frequence: 'mensuel', limiteKg: 25, tarifParKilo: 8.5, notes: '' },
        ],
    },
    {
        email: 'demo.baobab@gvipcolis-demo.com', nom: 'Moussa Traoré', nomEntreprise: 'Baobab Fret (DÉMO)',
        telephone: '+33 7 22 33 44 55', pays: 'France', adresse: '45 avenue Berthelot, 69007 Lyon', tarifParKilo: 7,
        description: "Fret aérien Lyon et Paris vers toute la Côte d'Ivoire. Tarifs dégressifs à partir de 15 kg.",
        logo: logoSvg('BAOBAB', '#5b3a8c', '#8e63c9', ARBRE),
        departs: [
            { paysDepart: 'France', villeDepart: 'Lyon', paysArrivee: "Côte d'Ivoire", villeArrivee: 'Abidjan', date: '2026-10-11', heure: '07:15', frequence: 'hebdo', limiteKg: 23, tarifParKilo: 7, notes: '' },
            { paysDepart: 'France', villeDepart: 'Paris', paysArrivee: "Côte d'Ivoire", villeArrivee: 'Yamoussoukro', date: '2026-10-18', heure: '16:45', frequence: 'unique', limiteKg: 15, tarifParKilo: 7.5, notes: 'Livraison à Yamoussoukro sous 72 h.' },
        ],
    },
];

const app = initializeApp(config);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
const resultat = [];

for (const c of COMPAGNIES) {
    let identifiants;
    try {
        identifiants = await createUserWithEmailAndPassword(auth, c.email, MOT_DE_PASSE);
    } catch (e) {
        if (e.code !== 'auth/email-already-in-use') throw e;
        // compte deja existant : il faut que MOT_DE_PASSE soit son mot de passe
        identifiants = await signInWithEmailAndPassword(auth, c.email, MOT_DE_PASSE);
    }
    const uid = identifiants.user.uid;

    // logo : Firebase Storage si les regles l'autorisent, sinon integre directement en data URI
    let logoUrl;
    try {
        const r = sRef(storage, `partenaires/${uid}/logo.svg`);
        await uploadString(r, c.logo, 'raw', { contentType: 'image/svg+xml' });
        logoUrl = await getDownloadURL(r);
    } catch (e) {
        console.log(`  Storage refuse (${e.code}) -> logo integre en data URI`);
        logoUrl = 'data:image/svg+xml;base64,' + Buffer.from(c.logo).toString('base64');
    }

    await set(ref(db, `partenaires/${uid}`), {
        nom: c.nom, nomEntreprise: c.nomEntreprise, email: c.email, telephone: c.telephone,
        pays: c.pays, adresse: c.adresse, statut: 'actif', role: 'partenaire',
        dateInscription: Date.now(), tarifParKilo: c.tarifParKilo,
        logoUrl, description: c.description, demo: true,
    });

    for (const d of c.departs) {
        await set(push(ref(db, 'expeditions')), {
            reference: `GV-${Math.floor(10000 + Math.random() * 89999)}`, dateCreation: Date.now(),
            idPartenaire: uid, nomCompagnie: c.nomEntreprise, logoUrl, descriptionCompagnie: c.description,
            ...d, poids: '', statut: 'Planifié', compagnieSuspendue: false, demo: true,
        });
    }
    console.log(`OK ${c.nomEntreprise} : ${c.departs.length} departs`);
    resultat.push({ uid, email: c.email, motDePasse: MOT_DE_PASSE, nomEntreprise: c.nomEntreprise });
    await signOut(auth);
}

writeFileSync('scripts/demo/comptes-demo.json', JSON.stringify(resultat, null, 2));
await deleteApp(app);
process.exit(0);

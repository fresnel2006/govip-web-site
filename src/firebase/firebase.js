// ────────────────────────────────────────────────────────────────────────
//  src/firebase/firebase.js
//
//  Fichier UNIQUE regroupant :
//    - la configuration Firebase (clés du projet)
//    - l'initialisation de l'application Firebase
//    - toutes les fonctions d'accès à Realtime Database (créneaux, rendez-vous)
//    - toutes les fonctions d'authentification admin
//
//  Objectif : les composants .jsx (Utilisateurs.jsx, Admin.jsx, ...) ne
//  doivent plus jamais importer `firebase/app`, `firebase/database` ou
//  `firebase/auth` directement, ni connaître la structure de la base.
//  Ils importent uniquement les fonctions exposées ici.
// ────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import {
    getDatabase,
    ref,
    onValue,
    push,
    set,
    update,
    remove,
    get,
    query,
    orderByChild,
    equalTo,
    serverTimestamp,
} from 'firebase/database';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
} from 'firebase/auth';
// AJOUT : Firebase Storage, utilise pour le logo + la preuve d'activite
// deposes dans le formulaire "devenir partenaire".
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// ── Configuration du projet Firebase ──
// Les valeurs viennent du fichier .env (VITE_FIREBASE_...).
// Le "||" garde l'ancienne valeur en secours : si jamais une variable
// n'est pas définie (ex. build Vercel actuel sans ces variables configurées),
// le site continue de fonctionner exactement comme avant, sans rien casser.
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAzEog53jnWZksBq5SXo41mVvGMjhuqwV8",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "govip-parcels-appointments.firebaseapp.com",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://govip-parcels-appointments-default-rtdb.firebaseio.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "govip-parcels-appointments",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "govip-parcels-appointments.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "5781132822",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:5781132822:web:906072edda7ad4b72d0737",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WDLCTNFMW1",
};

// ── Initialisation ──
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
// AJOUT : export de Storage, utilise dans Acceuil.jsx pour uploader
// le logo et la preuve d'activite du formulaire partenaire.
export const storage = getStorage(app);

// Instance secondaire : sert uniquement à créer des comptes de compagnies
// depuis l'espace admin SANS déconnecter l'admin de sa propre session.
const appSecondaire = initializeApp(firebaseConfig, 'Secondary');
const authSecondaire = getAuth(appSecondaire);
const dbSecondaire = getDatabase(appSecondaire);

/**
 * Écoute en temps réel une branche de la base et la renvoie sous forme de liste (id inclus).
 * @param {string} chemin
 * @param {(liste: Array<Object>) => void} onData
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} fonction à appeler pour arrêter l'écoute
 */
function ecouterListe(chemin, onData, onError) {
    return onValue(
        ref(db, chemin),
        (snapshot) => {
            const data = snapshot.val() || {};
            onData(Object.entries(data).map(([id, val]) => ({ id, ...val })));
        },
        (error) => {
            console.error(`Erreur lecture ${chemin} :`, error);
            if (onError) onError(error);
        }
    );
}

// ────────────────────────────────────────────────────────────────────────
//  CRÉNEAUX  (branche "creneaux" de la base)
// ────────────────────────────────────────────────────────────────────────

/**
 * Écoute en temps réel la liste des créneaux.
 * @param {(creneaux: Array<Object>) => void} onData - appelé à chaque mise à jour avec la liste des créneaux (id inclus)
 * @param {(error: Error) => void} [onError] - appelé en cas d'erreur de lecture
 * @returns {() => void} fonction à appeler pour arrêter l'écoute
 */
export function ecouterCreneaux(onData, onError) {
    const creneauxRef = ref(db, 'creneaux');
    const unsubscribe = onValue(
        creneauxRef,
        (snapshot) => {
            const data = snapshot.val() || {};
            const liste = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            onData(liste);
        },
        (error) => {
            console.error('Erreur lecture créneaux :', error);
            if (onError) onError(error);
        }
    );
    return unsubscribe;
}

/**
 * Ajoute un nouveau créneau dans Firebase.
 * @param {Object} nouveauCreneau
 * @returns {Promise<string>} la clé Firebase du créneau créé
 */
export async function ajouterCreneau(nouveauCreneau) {
    const creneauxRef = ref(db, 'creneaux');
    const nouvelleRef = await push(creneauxRef, {
        ...nouveauCreneau,
        createdAt: serverTimestamp(),
    });
    return nouvelleRef.key;
}

/**
 * Modifie (fusion) un créneau existant.
 * @param {string} id
 * @param {Object} donnees
 */
export async function modifierCreneau(id, donnees) {
    const creneauRef = ref(db, `creneaux/${id}`);
    await update(creneauRef, donnees);
}

/**
 * Supprime définitivement un créneau.
 * @param {string} id
 */
export async function supprimerCreneau(id) {
    const creneauRef = ref(db, `creneaux/${id}`);
    await remove(creneauRef);
}

// ────────────────────────────────────────────────────────────────────────
//  RENDEZ-VOUS  (branche "rendezVous" de la base)
// ────────────────────────────────────────────────────────────────────────

/**
 * Écoute en temps réel la liste complète des rendez-vous.
 * @param {(rendezVous: Array<Object>) => void} onData
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} fonction à appeler pour arrêter l'écoute
 */
export function ecouterRendezVous(onData, onError) {
    const rendezVousRef = ref(db, 'rendezVous');
    const unsubscribe = onValue(
        rendezVousRef,
        (snapshot) => {
            const data = snapshot.val() || {};
            const liste = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            onData(liste);
        },
        (error) => {
            console.error('Erreur lecture rendez-vous :', error);
            if (onError) onError(error);
        }
    );
    return unsubscribe;
}

/**
 * Écoute en temps réel un rendez-vous précis (par sa clé Firebase).
 * @param {string} id
 * @param {(rendezVous: Object|null) => void} onData - reçoit `null` si le rendez-vous n'existe pas/plus
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} fonction à appeler pour arrêter l'écoute
 */
export function ecouterRendezVousParId(id, onData, onError) {
    const rdvRef = ref(db, `rendezVous/${id}`);
    const unsubscribe = onValue(
        rdvRef,
        (snapshot) => {
            const data = snapshot.val();
            onData(data ? { id, ...data } : null);
        },
        (error) => {
            if (onError) onError(error);
        }
    );
    return unsubscribe;
}

/**
 * Recherche les rendez-vous associés à un numéro de téléphone (déjà formaté avec l'indicatif).
 * Résultat trié du plus récent au plus ancien.
 * @param {string} telephoneComplet - ex : "+225 07 00 00 00 00"
 * @returns {Promise<Array<Object>>}
 */
export async function rechercherRendezVousParTelephone(telephoneComplet) {
    const rdvRequete = query(ref(db, 'rendezVous'), orderByChild('telephone'), equalTo(telephoneComplet));
    const snapshot = await get(rdvRequete);
    const data = snapshot.val() || {};
    return Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => (b.dateCreation || 0) - (a.dateCreation || 0));
}

/**
 * Crée un nouveau rendez-vous dans Firebase.
 * @param {Object} donneesRendezVous
 * @returns {Promise<string>} la clé Firebase (= token) du rendez-vous créé
 */
export async function creerRendezVous(donneesRendezVous) {
    const rendezVousRef = ref(db, 'rendezVous');
    const nouvelleEntreeRef = push(rendezVousRef);
    await set(nouvelleEntreeRef, donneesRendezVous);
    return nouvelleEntreeRef.key;
}

/**
 * Met à jour (fusion) un rendez-vous existant.
 * Utilisé pour : modification par le client, changement de statut par l'admin,
 * annulation, confirmation de prise en charge du colis, etc.
 * @param {string} id
 * @param {Object} donnees
 */
export async function mettreAJourRendezVous(id, donnees) {
    const rdvRef = ref(db, `rendezVous/${id}`);
    await update(rdvRef, donnees);
}

/**
 * Supprime définitivement un rendez-vous.
 * @param {string} id
 */
export async function supprimerRendezVous(id) {
    const rdvRef = ref(db, `rendezVous/${id}`);
    await remove(rdvRef);
}

// ────────────────────────────────────────────────────────────────────────
//  DEMANDES DE PARTENARIAT  (branche "demandesPartenaires" + Storage)
// ────────────────────────────────────────────────────────────────────────

/**
 * Enregistre une demande "devenir partenaire" : upload du logo et de la
 * preuve d'activité dans Storage, puis écriture dans la base.
 * La Cloud Function notifierNouvelleDemandePartenaire envoie ensuite l'email.
 * @param {Object} donnees - nom, prenom, email, telephone
 * @param {{logo: File, preuve: File}} fichiers
 * @returns {Promise<string>} la clé Firebase de la demande créée
 */
export async function creerDemandePartenaire(donnees, fichiers) {
    // on cree d'abord la reference (avec sa cle unique) avant d'ecrire quoi que ce soit,
    // pour pouvoir ranger les fichiers dans un dossier Storage nomme avec cette meme cle
    const nouvelleRef = push(ref(db, 'demandesPartenaires'));
    const demandeId = nouvelleRef.key;

    const refLogo = storageRef(storage, `demandesPartenaires/${demandeId}/logo-${fichiers.logo.name}`);
    const refPreuve = storageRef(storage, `demandesPartenaires/${demandeId}/preuve-${fichiers.preuve.name}`);

    await uploadBytes(refLogo, fichiers.logo);
    await uploadBytes(refPreuve, fichiers.preuve);

    const logoUrl = await getDownloadURL(refLogo);
    const preuveUrl = await getDownloadURL(refPreuve);

    await set(nouvelleRef, {
        ...donnees,
        logoUrl,
        preuveUrl,
        dateCreation: serverTimestamp(),
    });
    return demandeId;
}

/**
 * Écoute en temps réel les demandes "devenir partenaire" reçues depuis l'accueil.
 */
export function ecouterDemandesPartenaires(onData, onError) {
    return ecouterListe('demandesPartenaires', onData, onError);
}

/**
 * Met à jour (fusion) une demande de partenariat (ex : { traitee: true }).
 */
export async function modifierDemandePartenaire(id, donnees) {
    await update(ref(db, `demandesPartenaires/${id}`), donnees);
}

// ────────────────────────────────────────────────────────────────────────
//  COMPAGNIES DE TRANSPORT  (branche "partenaires", clé = uid du compte)
// ────────────────────────────────────────────────────────────────────────

/**
 * Écoute en temps réel la liste de toutes les compagnies.
 */
export function ecouterCompagnies(onData, onError) {
    return ecouterListe('partenaires', onData, onError);
}

/**
 * Crée le compte de connexion d'une compagnie + sa fiche dans la base.
 * Passe par l'instance secondaire pour ne pas déconnecter l'admin.
 * @returns {Promise<string>} l'uid de la compagnie créée
 */
export async function creerCompagnie({ email, motDePasse, nom, nomEntreprise, telephone, pays, adresse, logoUrl = '', description = '' }) {
    const identifiants = await createUserWithEmailAndPassword(authSecondaire, email, motDePasse);
    const uid = identifiants.user.uid;

    await set(ref(dbSecondaire, `partenaires/${uid}`), {
        nom,
        nomEntreprise,
        email,
        telephone,
        pays,
        adresse,
        logoUrl,
        description,
        statut: 'actif',
        role: 'partenaire',
        dateInscription: Date.now(),
        tarifParKilo: 0, // défini ensuite par la compagnie depuis son profil
    });

    await signOut(authSecondaire);
    return uid;
}

/**
 * Met à jour (fusion) la fiche d'une compagnie.
 * Utilisé pour : modification des infos, suspension / réactivation.
 */
export async function modifierCompagnie(uid, donnees) {
    await update(ref(db, `partenaires/${uid}`), donnees);
}

/**
 * Supprime la fiche d'une compagnie : elle n'a plus accès à son espace.
 * (Le compte de connexion Firebase Auth, lui, ne peut être supprimé que
 * depuis la console Firebase.)
 */
export async function supprimerCompagnie(uid) {
    await remove(ref(db, `partenaires/${uid}`));
}

/**
 * Envoie à l'adresse donnée l'email Firebase de réinitialisation du mot de passe.
 */
export async function envoyerReinitialisationMotDePasse(email) {
    await sendPasswordResetEmail(auth, email);
}

// ────────────────────────────────────────────────────────────────────────
//  EXPÉDITIONS  (branche "expeditions", lecture publique)
//
//  Une expédition est ajoutée par une compagnie depuis son espace
//  partenaire ("Mes expéditions"). Tant qu'elle est "Planifié" et à venir,
//  elle est affichée comme départ sur la page d'accueil.
//  { idPartenaire, reference, nomCompagnie, paysDepart, villeDepart,
//    paysArrivee, villeArrivee, date: "YYYY-MM-DD", heure: "HH:MM",
//    frequence, limiteKg, tarifParKilo, poids, statut, notes,
//    dateCreation, compagnieSuspendue (posé par l'admin) }
//  Les anciennes expéditions ont une date en texte ("14 septembre 2026")
//  et pas de champs de départ : elles restent lisibles.
// ────────────────────────────────────────────────────────────────────────

export const PAYS_DEPARTS = ['France', "Côte d'Ivoire"];

export const STATUTS_EXPEDITION = ['Planifié', 'En cours', 'À récupérer', 'Livré'];

export const FREQUENCES_DEPART = {
    unique: 'Départ unique',
    hebdo: 'Toutes les semaines',
    bimensuel: 'Toutes les deux semaines',
    mensuel: 'Tous les mois',
};

const MOIS_FR = {
    janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
};

/** Lit une date "YYYY-MM-DD" ou "14 septembre 2026". */
export function lireDateExpedition(valeur) {
    const texte = String(valeur || '');
    const iso = texte.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const fr = texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .match(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/);
    if (fr && MOIS_FR[fr[2]] !== undefined) return new Date(Number(fr[3]), MOIS_FR[fr[2]], Number(fr[1]));
    return null;
}

/**
 * Prochaine date (>= aujourd'hui) d'une expédition, en tenant compte de sa fréquence.
 * @returns {Date|null} null si elle est unique et déjà passée (ou sans date lisible)
 */
export function prochaineDateDepart(expedition, aujourdhui = new Date()) {
    const debut = lireDateExpedition(expedition?.date);
    if (!debut) return null;
    const jour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
    if (debut >= jour) return debut;

    const pasJours = { hebdo: 7, bimensuel: 14 }[expedition.frequence];
    if (pasJours) {
        const ecart = Math.ceil((jour - debut) / 86400000 / pasJours) * pasJours;
        return new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + ecart);
    }
    if (expedition.frequence === 'mensuel') {
        const d = new Date(debut);
        while (d < jour) d.setMonth(d.getMonth() + 1);
        return d;
    }
    return null;
}

/** "Tous les samedis", "Un samedi sur deux", "Le 4 de chaque mois", "Départ unique". */
export function libelleFrequence(expedition) {
    const debut = lireDateExpedition(expedition?.date);
    if (!debut) return FREQUENCES_DEPART[expedition?.frequence] || 'Départ unique';
    const jourSemaine = debut.toLocaleDateString('fr-FR', { weekday: 'long' });
    if (expedition.frequence === 'hebdo') return `Tous les ${jourSemaine}s`;
    if (expedition.frequence === 'bimensuel') return `Un ${jourSemaine} sur deux`;
    if (expedition.frequence === 'mensuel') return `Le ${debut.getDate()} de chaque mois`;
    return 'Départ unique';
}

/** Vrai si l'expédition doit apparaître comme départ sur la page d'accueil. */
export function estDepartAffiche(expedition) {
    return expedition.statut === 'Planifié'
        && !expedition.compagnieSuspendue
        && Boolean(prochaineDateDepart(expedition));
}

/** Écoute toutes les expéditions (lecture publique : page d'accueil, admin). */
export function ecouterToutesExpeditions(onData, onError) {
    return ecouterListe('expeditions', onData, onError);
}

/** Écoute les expéditions d'une compagnie. */
export function ecouterExpeditionsCompagnie(idPartenaire, onData, onError) {
    return onValue(
        query(ref(db, 'expeditions'), orderByChild('idPartenaire'), equalTo(idPartenaire)),
        (snapshot) => {
            const data = snapshot.val() || {};
            onData(Object.entries(data).map(([id, val]) => ({ id, ...val })));
        },
        (error) => {
            console.error('Erreur lecture expéditions :', error);
            if (onError) onError(error);
        }
    );
}

/** Crée une expédition (id absent, une référence GV-xxxxx est générée) ou remplace une existante. */
export async function enregistrerExpedition(id, donnees) {
    if (id) {
        await set(ref(db, `expeditions/${id}`), donnees);
        return id;
    }
    const nouvelleRef = push(ref(db, 'expeditions'));
    await set(nouvelleRef, {
        reference: `GV-${Math.floor(10000 + Math.random() * 89999)}`,
        dateCreation: Date.now(),
        ...donnees,
    });
    return nouvelleRef.key;
}

export async function supprimerExpedition(id) {
    await remove(ref(db, `expeditions/${id}`));
}

/**
 * Masque (suspension ou suppression de la compagnie) ou ré-affiche
 * les expéditions d'une compagnie sur la page d'accueil.
 */
export async function masquerExpeditionsCompagnie(idPartenaire, masquer) {
    const snapshot = await get(query(ref(db, 'expeditions'), orderByChild('idPartenaire'), equalTo(idPartenaire)));
    const cles = Object.keys(snapshot.val() || {});
    if (cles.length === 0) return;
    await update(ref(db, 'expeditions'), Object.fromEntries(cles.map((c) => [`${c}/compagnieSuspendue`, masquer])));
}

// ────────────────────────────────────────────────────────────────────────
//  SUPPORT DES COMPAGNIES
// ────────────────────────────────────────────────────────────────────────

export function ecouterTousTickets(onData, onError) {
    return ecouterListe('ticketsSupport', onData, onError);
}

export async function modifierTicket(id, donnees) {
    await update(ref(db, `ticketsSupport/${id}`), donnees);
}

// ────────────────────────────────────────────────────────────────────────
//  AUTHENTIFICATION ADMIN (Firebase Auth)
// ────────────────────────────────────────────────────────────────────────

/**
 * Écoute les changements d'état de connexion (connecté / déconnecté).
 * @param {(user: import('firebase/auth').User|null) => void} callback
 * @returns {() => void} fonction à appeler pour arrêter l'écoute
 */
export function ecouterEtatAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

/**
 * Connecte un administrateur avec email / mot de passe.
 * @param {string} email
 * @param {string} motDePasse
 */
export async function connexionAdmin(email, motDePasse) {
    await signInWithEmailAndPassword(auth, email, motDePasse);
}

/**
 * Indique si un compte est administrateur : son uid doit figurer dans la
 * branche "admins" de la base (ex : admins/<uid> = true), ajoutée à la main
 * depuis la console Firebase.
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function estAdmin(uid) {
    const snapshot = await get(ref(db, `admins/${uid}`));
    return snapshot.val() === true;
}

/**
 * Déconnecte l'administrateur actuellement connecté.
 */
export async function deconnexionAdmin() {
    await signOut(auth);
}

// ── Réexport utilitaire (utilisé ponctuellement pour horodater côté serveur) ──
export { serverTimestamp };

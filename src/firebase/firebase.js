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
    signOut,
} from 'firebase/auth';

// ── Configuration du projet Firebase ──
const firebaseConfig = {
    apiKey: "AIzaSyAzEog53jnWZksBq5SXo41mVvGMjhuqwV8",
    authDomain: "govip-parcels-appointments.firebaseapp.com",
    databaseURL: "https://govip-parcels-appointments-default-rtdb.firebaseio.com",
    projectId: "govip-parcels-appointments",
    storageBucket: "govip-parcels-appointments.firebasestorage.app",
    messagingSenderId: "5781132822",
    appId: "1:5781132822:web:906072edda7ad4b72d0737",
    measurementId: "G-WDLCTNFMW1",
};

// ── Initialisation ──
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

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
 * Déconnecte l'administrateur actuellement connecté.
 */
export async function deconnexionAdmin() {
    await signOut(auth);
}

// ── Réexport utilitaire (utilisé ponctuellement pour horodater côté serveur) ──
export { serverTimestamp };

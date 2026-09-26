import React, { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "firebase/database";

// ============ FIREBASE : CONFIGURATION ============
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Instance Firebase secondaire : sert uniquement à créer des comptes partenaires
// depuis l'espace admin SANS déconnecter l'admin de sa propre session.
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);
const secondaryDb = getDatabase(secondaryApp);

// ============ FIREBASE : FONCTIONS AUTH ============

async function seConnecter(email, motDePasse) {
  const userCredential = await signInWithEmailAndPassword(auth, email, motDePasse);
  return userCredential.user.uid;
}

async function seDeconnecter() {
  await signOut(auth);
}

async function recupererProfil(uid) {
  const snapshot = await get(ref(db, `partenaires/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

async function creerPartenaireParAdmin({ email, motDePasse, nom, nomEntreprise, telephone, pays, adresse }) {
  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, motDePasse);
  const uid = userCredential.user.uid;

  await set(ref(secondaryDb, `partenaires/${uid}`), {
    nom,
    nomEntreprise,
    email,
    telephone,
    pays,
    adresse,
    statut: "actif",
    role: "partenaire",
    dateInscription: Date.now(),
    tarifParKilo: 0, // NOUVEAU : à définir par le partenaire lui-même depuis son profil
  });

  await signOut(secondaryAuth);

  return uid;
}

function traduireErreur(code) {
  const messages = {
    "auth/email-already-in-use": "Cet email est déjà utilisé.",
    "auth/invalid-email": "Adresse email invalide.",
    "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
    "auth/user-not-found": "Aucun compte trouvé avec cet email.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Email ou mot de passe incorrect.",
  };
  return messages[code] || "Une erreur est survenue, réessayez.";
}

// ============ FIREBASE : FONCTIONS EXPEDITIONS ============
async function ajouterExpeditionFirebase(idPartenaire, { date, villeDepart, villeArrivee, poids, statut }) {
  const nouvelleRef = push(ref(db, "expeditions"));
  await set(nouvelleRef, {
    idPartenaire,
    reference: `GV-${Math.floor(10000 + Math.random() * 89999)}`,
    date,
    villeDepart,
    villeArrivee,
    poids,
    statut,
  });
  return nouvelleRef.key;
}

function ecouterExpeditionsPartenaire(idPartenaire, callback) {
  const q = query(ref(db, "expeditions"), orderByChild("idPartenaire"), equalTo(idPartenaire));
  return onValue(q, (snapshot) => {
    const data = snapshot.val() || {};
    const liste = Object.entries(data).map(([id, valeurs]) => ({ id, ...valeurs }));
    callback(liste);
  });
}

// ============ FIREBASE : FONCTIONS TICKETS ============
async function creerTicketFirebase(idPartenaire, { sujet, message }) {
  const nouvelleRef = push(ref(db, "ticketsSupport"));
  await set(nouvelleRef, {
    idPartenaire,
    date: Date.now(),
    sujet,
    message,
    statut: "En cours",
  });
  return nouvelleRef.key;
}

function ecouterTicketsPartenaire(idPartenaire, callback) {
  const q = query(ref(db, "ticketsSupport"), orderByChild("idPartenaire"), equalTo(idPartenaire));
  return onValue(q, (snapshot) => {
    const data = snapshot.val() || {};
    const liste = Object.entries(data).map(([id, valeurs]) => ({ id, ...valeurs }));
    callback(liste);
  });
}

// ============ DONNÉES STATIQUES (icônes, filtres, etc.) ============
const navItems = [
  { label: "Tableau de bord", icon: "home", key: "dashboard" },
  { label: "Mes expéditions", icon: "package", key: "expeditions" },
  { label: "Mes revenus", icon: "wallet", key: "revenus" },
  { label: "Mon profil", icon: "user", key: "profil" },
  { label: "Support", icon: "headset", key: "support" },
];

const statusStyles = {
  "En cours": "statusInProgress",
  "À récupérer": "statusPickup",
  "Planifié": "statusPlanned",
  "Livré": "statusDelivered",
};

const initialForm = { date: "", from: "", to: "Abidjan", weight: "", status: "Planifié" };

const news = [
  { date: "06 mai 2025", title: "Nouveau trajet : Paris – Abidjan", text: "Nous renforçons notre réseau pour vous offrir encore plus de flexibilité.", tone: "ocean" },
  { date: "28 avril 2025", title: "Optimisez vos envois", text: "Découvrez nos nouvelles options de suivi et de gestion de vos expéditions.", tone: "boxes" },
  { date: "15 avril 2025", title: "Rejoignez la communauté GVIP", text: "Devenez partenaire et profitez d'avantages exclusifs.", tone: "brand" },
];

const transactionStatusStyles = { "Payé": "statusPaid", "En attente": "statusPending" };

const faqs = [
  { q: "Comment suivre une expédition en cours ?", a: "Rendez-vous dans « Mes expéditions », chaque envoi affiche son statut en temps réel (Planifié, En cours, À récupérer, Livré)." },
  { q: "Quand suis-je payé après une livraison ?", a: "Les paiements sont traités automatiquement 48h après confirmation de la livraison et apparaissent dans « Mes revenus »." },
  { q: "Comment modifier mes informations bancaires ?", a: "Depuis « Mon profil », section Sécurité, vous pouvez mettre à jour vos coordonnées de paiement." },
  { q: "Puis-je annuler une expédition planifiée ?", a: "Oui, tant que le statut est « Planifié ». Contactez le support pour toute annulation d'une expédition déjà en cours." },
];

const ticketStatusStyles = { "En cours": "statusInProgress", "Résolu": "statusResolved" };

const expeditionFilters = ["Tous", "En cours", "À récupérer", "Planifié", "Livré"];

// ============ NOUVEAU : UTILITAIRES POUR LE GRAPHIQUE ET LES REVENUS ============

// Enlève les accents et met en minuscule, pour comparer les noms de mois sans se soucier des accents
function normaliserTexte(txt) {
  return txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const MOIS_MAP = {
  janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
};

// Interprète une date entrée en texte libre (ex: "14 septembre 2026") en objet Date.
// Renvoie null si le format n'est pas reconnu.
function parseDateFr(texte) {
  if (!texte) return null;
  const norm = normaliserTexte(texte);
  const m = norm.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const jour = parseInt(m[1], 10);
  const mois = MOIS_MAP[m[2]];
  const annee = parseInt(m[3], 10);
  if (mois === undefined) return null;
  return new Date(annee, mois, jour);
}

// Extrait la valeur numérique d'un champ poids saisi en texte libre (ex: "10 kg" -> 10)
function extraireNombre(texte) {
  if (typeof texte === "number") return texte;
  if (!texte) return 0;
  const m = String(texte).replace(",", ".").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function formaterLabelMois(cle) {
  const [annee, mois] = cle.split("-");
  const noms = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  return `${noms[parseInt(mois, 10) - 1]} ${annee.slice(2)}`;
}

// Construit les données du graphique "Vos performances" à partir des vraies expéditions
// du partenaire : nombre d'expéditions par mois, sur les 6 derniers mois où il y a des données.
function genererDonneesGraphique(shipments) {
  const compteurParMois = {};
  shipments.forEach((s) => {
    const date = parseDateFr(s.date);
    if (!date) return;
    const cle = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    compteurParMois[cle] = (compteurParMois[cle] || 0) + 1;
  });

  const clesTriees = Object.keys(compteurParMois).sort();
  const dernieresCles = clesTriees.slice(-6);

  if (dernieresCles.length === 0) {
    return { points: [], labels: [], vide: true };
  }
  if (dernieresCles.length === 1) {
    // il faut au moins 2 points pour tracer une ligne
    return {
      points: [0, compteurParMois[dernieresCles[0]]],
      labels: ["", formaterLabelMois(dernieresCles[0])],
      vide: false,
    };
  }

  return {
    points: dernieresCles.map((cle) => compteurParMois[cle]),
    labels: dernieresCles.map(formaterLabelMois),
    vide: false,
  };
}

function Icon({ name, className }) {
  const paths = {
    home: <path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" />,
    package: (
      <>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8" />
        <path d="M12 13v9" />
      </>
    ),
    truck: (
      <>
        <path d="M2 8h11v8H2z" />
        <path d="M13 11h4l4 3v2h-8z" />
        <circle cx="6" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <path d="M3 7 5 3h11l2 4" />
        <circle cx="16.5" cy="13.5" r="1.2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
      </>
    ),
    headset: (
      <>
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <rect x="2.5" y="13" width="4" height="6" rx="1.4" />
        <rect x="17.5" y="13" width="4" height="6" rx="1.4" />
        <path d="M20 19v1a3 3 0 0 1-3 3h-3" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 1.9-1.1 1.6-3 1.9c-2 .3-3 .9-3 2s1.3 1.9 3 1.9 3-.8 3-2" />
      </>
    ),
    star: <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.5Z" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronUp: <path d="m6 15 6-6 6 6" />,
    arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="M12 8.2v.1M12 11v5.4" />
      </>
    ),
    map: (
      <>
        <circle cx="12" cy="10" r="3.2" />
        <path d="M12 21c4.5-4.6 7-8 7-11a7 7 0 0 0-14 0c0 3 2.5 6.4 7 11Z" />
      </>
    ),
    ship: (
      <>
        <path d="M4 15h16l-2 5H6l-2-5Z" />
        <path d="M6 15V9h9l3 6" />
        <path d="M10 9V4h3v5" />
      </>
    ),
    plane: <path d="M2 16l7-2 4-9 2 .6-2 8.4 6-1.4.6 2-6 3-1 4-2-.4 1-3.6-6 1.6-2-1.6Z" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    check: <path d="m5 13 4 4L19 7" />,
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="m8 12.5 2.6 2.6L16.5 9" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    question: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="M9.3 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.5 1.6-2.5 3.4" />
        <path d="M12 17v.1" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1.1.5 1.1 1.1V20c0 .6-.5 1.1-1.1 1.1C10.6 21.1 2.9 13.4 2.9 4.3 2.9 3.7 3.4 3.2 4 3.2h3.3c.6 0 1.1.5 1.1 1.1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.8Z" />,
    lock: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l2-2h6l2 2h3v11H4Z" />
        <circle cx="12" cy="13.5" r="3.4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    send: <path d="m3 11 18-8-8 18-2-8-8-2Z" />,
    alertTriangle: (
      <>
        <path d="M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z" />
        <path d="M12 9v4.5" />
        <path d="M12 17v.1" />
      </>
    ),
  };
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

// CORRECTION : protégé contre la division par zéro quand toutes les valeurs sont identiques
// (max === min), ce qui plantait le rendu si un partenaire n'avait par exemple qu'un seul
// mois de données avec la même valeur partout.
function buildChartPath(points, width, height) {
  if (!points || points.length === 0) {
    return { line: "", area: "", coords: [] };
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * height;
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area, coords };
}

// ============ ÉCRAN DE CONNEXION (partenaires ET admin) ============
function EcranConnexion() {
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await seConnecter(email.trim(), motDePasse.trim());
    } catch (err) {
      console.error("Erreur de connexion :", err);
      setErreur(traduireErreur(err.code));
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className={styles.app} style={{ alignItems: "center", justifyContent: "center" }}>
      <div className={styles.panel} style={{ width: 380, maxWidth: "90%" }}>
        <h2 className={styles.panelTitleStandalone}>Connexion partenaire</h2>
        <p style={{ fontSize: 12.5, color: "#6b7280", marginTop: -8, marginBottom: 16 }}>
          Vous n'avez pas encore de compte ? Contactez GVIP pour en obtenir un.
        </p>
        {erreur && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{erreur}</p>}
        <form onSubmit={soumettre} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Mot de passe</label>
            <input type="password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </div>
          <button type="submit" className={styles.modalSubmit} disabled={chargement}>
            {chargement ? "Veuillez patienter..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ ÉCRAN "PROFIL INTROUVABLE" ============
function EcranProfilIntrouvable({ email }) {
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);

  const gererDeconnexion = async () => {
    setDeconnexionEnCours(true);
    try {
      await seDeconnecter();
    } finally {
      setDeconnexionEnCours(false);
    }
  };

  return (
    <div className={styles.app} style={{ alignItems: "center", justifyContent: "center" }}>
      <div className={styles.panel} style={{ width: 420, maxWidth: "90%", textAlign: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#fdecea",
            color: "#c0392b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Icon name="alertTriangle" style={{ width: 24, height: 24 }} />
        </div>
        <h2 className={styles.panelTitleStandalone} style={{ marginBottom: 8 }}>
          Profil introuvable
        </h2>
        <p style={{ fontSize: 13.5, color: "#6b7280", marginBottom: 4 }}>
          Le compte <strong>{email}</strong> a bien été authentifié, mais aucune fiche
          partenaire ne lui correspond dans la base de données.
        </p>
        <p style={{ fontSize: 13.5, color: "#6b7280", marginBottom: 20 }}>
          Ce compte a probablement été créé directement dans la console Firebase
          plutôt que via l'espace admin. Contactez l'administrateur pour qu'il
          complète votre fiche partenaire.
        </p>
        <button className={styles.modalSubmit} onClick={gererDeconnexion} disabled={deconnexionEnCours}>
          {deconnexionEnCours ? "Veuillez patienter..." : "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}

// ============ ESPACE ADMIN (/admin) ============
const MOT_DE_PASSE_ADMIN = "GvipAdmin2026"; // à changer !

function PageAdmin() {
  const [deverrouille, setDeverrouille] = useState(false);
  const [motDePasseSaisi, setMotDePasseSaisi] = useState("");
  const [erreurAcces, setErreurAcces] = useState("");

  const [form, setForm] = useState({
    email: "",
    motDePasse: "",
    nom: "",
    nomEntreprise: "",
    telephone: "",
    pays: "France",
    adresse: "",
  });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [chargement, setChargement] = useState(false);

  const verifierAcces = (e) => {
    e.preventDefault();
    if (motDePasseSaisi === MOT_DE_PASSE_ADMIN) {
      setDeverrouille(true);
      setErreurAcces("");
    } else {
      setErreurAcces("Mot de passe incorrect.");
    }
  };

  const majChamp = (champ, valeur) => setForm((p) => ({ ...p, [champ]: valeur }));

  const genererMotDePasse = () => {
    const motDePasse = Math.random().toString(36).slice(-8) + "!" + Math.floor(Math.random() * 100);
    majChamp("motDePasse", motDePasse);
  };

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    setChargement(true);
    try {
      await creerPartenaireParAdmin({
        ...form,
        email: form.email.trim(),
        motDePasse: form.motDePasse.trim(),
      });
      setSucces(`Compte créé pour ${form.email.trim()}. Transmettez-lui l'email et le mot de passe : ${form.motDePasse.trim()}`);
      setForm({
        email: "",
        motDePasse: "",
        nom: "",
        nomEntreprise: "",
        telephone: "",
        pays: "France",
        adresse: "",
      });
    } catch (err) {
      console.error("Erreur lors de la création du partenaire :", err);
      setErreur(traduireErreur(err.code));
    } finally {
      setChargement(false);
    }
  };

  if (!deverrouille) {
    return (
      <div className={styles.app} style={{ alignItems: "center", justifyContent: "center" }}>
        <div className={styles.panel} style={{ width: 340, maxWidth: "90%" }}>
          <h2 className={styles.panelTitleStandalone}>Accès admin</h2>
          {erreurAcces && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{erreurAcces}</p>}
          <form onSubmit={verifierAcces} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className={styles.field}>
              <label>Mot de passe admin</label>
              <input
                type="password"
                required
                value={motDePasseSaisi}
                onChange={(e) => setMotDePasseSaisi(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.modalSubmit}>
              Entrer
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app} style={{ alignItems: "center", justifyContent: "center" }}>
      <div className={styles.panel} style={{ width: 440, maxWidth: "92%" }}>
        <h2 className={styles.panelTitleStandalone}>Créer un compte partenaire</h2>

        {succes && (
          <div className={styles.successBanner} style={{ display: "block" }}>
            {succes}
          </div>
        )}
        {erreur && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>{erreur}</p>}

        <form onSubmit={soumettre} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className={styles.field}>
            <label>Email du partenaire</label>
            <input type="email" required value={form.email} onChange={(e) => majChamp("email", e.target.value)} />
          </div>

          <div className={styles.field}>
            <label>Mot de passe à lui transmettre</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                required
                minLength={6}
                value={form.motDePasse}
                onChange={(e) => majChamp("motDePasse", e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className={styles.modalCancel} onClick={genererMotDePasse}>
                Générer
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label>Nom complet</label>
            <input required value={form.nom} onChange={(e) => majChamp("nom", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Nom de l'entreprise</label>
            <input value={form.nomEntreprise} onChange={(e) => majChamp("nomEntreprise", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Téléphone</label>
            <input value={form.telephone} onChange={(e) => majChamp("telephone", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label>Pays</label>
            <select value={form.pays} onChange={(e) => majChamp("pays", e.target.value)}>
              <option value="France">France</option>
              <option value="Côte d'Ivoire">Côte d'Ivoire</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Adresse</label>
            <input value={form.adresse} onChange={(e) => majChamp("adresse", e.target.value)} />
          </div>

          <button type="submit" className={styles.modalSubmit} disabled={chargement}>
            {chargement ? "Création en cours..." : "Créer le compte"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ COMPOSANT PRINCIPAL ============
export default function Dashboard() {
  const estPageAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  // ---------- Authentification ----------
  const [uid, setUid] = useState(null);
  const [emailConnecte, setEmailConnecte] = useState(null);
  const [profile, setProfile] = useState(null);
  const [verificationEnCours, setVerificationEnCours] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUid(user.uid);
          setEmailConnecte(user.email);
          const donneesProfil = await recupererProfil(user.uid);
          setProfile(donneesProfil);
        } else {
          setUid(null);
          setEmailConnecte(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du profil :", err);
        setUid(null);
        setEmailConnecte(null);
        setProfile(null);
      } finally {
        setVerificationEnCours(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ---------- Navigation ----------
  const [navOpen, setNavOpen] = useState(false);
  const [section, setSection] = useState("dashboard");

  // ---------- Expéditions ----------
  const [shipments, setShipments] = useState([]);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [formExpedition, setFormExpedition] = useState(initialForm);
  const [expFilter, setExpFilter] = useState("Tous");
  const [expSearch, setExpSearch] = useState("");

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = ecouterExpeditionsPartenaire(uid, setShipments);
    return () => unsubscribe();
  }, [uid]);

  // ---------- Revenus ----------
  const [retraitOuvert, setRetraitOuvert] = useState(false);
  const [montant, setMontant] = useState("");

  // ---------- Profil ----------
  const [profilForm, setProfilForm] = useState(null);
  const [profilEditMode, setProfilEditMode] = useState(false);

  useEffect(() => {
    if (profile) setProfilForm(profile);
  }, [profile]);

  // ---------- Support ----------
  const [tickets, setTickets] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [supportForm, setSupportForm] = useState({ sujet: "", message: "" });
  const [supportEnvoye, setSupportEnvoye] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = ecouterTicketsPartenaire(uid, setTickets);
    return () => unsubscribe();
  }, [uid]);

  const majChampExpedition = (champ, valeur) => setFormExpedition((prec) => ({ ...prec, [champ]: valeur }));
  const ouvrirModal = () => setModalOuvert(true);
  const fermerModal = () => {
    setModalOuvert(false);
    setFormExpedition(initialForm);
  };

  const ajouterExpedition = async (e) => {
    e.preventDefault();
    if (!formExpedition.date || !formExpedition.from || !formExpedition.weight) return;
    try {
      await ajouterExpeditionFirebase(uid, {
        date: formExpedition.date,
        villeDepart: formExpedition.from,
        villeArrivee: formExpedition.to,
        poids: formExpedition.weight,
        statut: formExpedition.status,
      });
      fermerModal();
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'expédition :", err);
      alert("Impossible d'ajouter l'expédition. Réessayez.");
    }
  };

  const demanderRetrait = (e) => {
    e.preventDefault();
    setRetraitOuvert(false);
    setMontant("");
  };

  const majChampProfil = (champ, valeur) => setProfilForm((p) => ({ ...p, [champ]: valeur }));
  const annulerProfil = () => {
    setProfilForm(profile);
    setProfilEditMode(false);
  };
  const enregistrerProfil = async (e) => {
    e.preventDefault();
    try {
      // CORRECTION : conversion explicite du tarif par kilo en nombre avant enregistrement
      const donneesAEnregistrer = {
        ...profile,
        ...profilForm,
        tarifParKilo: parseFloat(profilForm.tarifParKilo) || 0,
      };
      await set(ref(db, `partenaires/${uid}`), donneesAEnregistrer);
      setProfile(donneesAEnregistrer);
      setProfilEditMode(false);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du profil :", err);
      alert("Impossible d'enregistrer le profil. Réessayez.");
    }
  };

  const majChampSupport = (champ, valeur) => setSupportForm((p) => ({ ...p, [champ]: valeur }));
  const envoyerSupport = async (e) => {
    e.preventDefault();
    if (!supportForm.sujet || !supportForm.message) return;
    try {
      await creerTicketFirebase(uid, supportForm);
      setSupportEnvoye(true);
      setSupportForm({ sujet: "", message: "" });
      setTimeout(() => setSupportEnvoye(false), 4000);
    } catch (err) {
      console.error("Erreur lors de l'envoi du ticket :", err);
      alert("Impossible d'envoyer le message. Réessayez.");
    }
  };

  const allerA = (key) => {
    setSection(key);
    setNavOpen(false);
  };

  // ---------- Route admin ----------
  if (estPageAdmin) {
    return <PageAdmin />;
  }

  // ---------- Écrans conditionnels ----------
  if (verificationEnCours) {
    return <p style={{ textAlign: "center", marginTop: 60 }}>Chargement...</p>;
  }

  if (!uid) {
    return <EcranConnexion />;
  }

  if (!profile) {
    return <EcranProfilIntrouvable email={emailConnecte} />;
  }

  const initials = profile.nom.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const filteredShipments = shipments.filter((s) => {
    const matchFilter = expFilter === "Tous" || s.statut === expFilter;
    const q = expSearch.toLowerCase();
    const matchSearch =
      (s.reference || "").toLowerCase().includes(q) ||
      (s.villeDepart || "").toLowerCase().includes(q) ||
      (s.villeArrivee || "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // NOUVEAU : calcul de l'estimation des revenus (poids total livré × tarif par kilo du partenaire)
  const poidsLivreTotal = shipments
    .filter((s) => s.statut === "Livré")
    .reduce((somme, s) => somme + extraireNombre(s.poids), 0);
  const tarifKilo = profile.tarifParKilo || 0;
  const estimationRevenus = poidsLivreTotal * tarifKilo;

  // NOUVEAU : graphique basé sur les vraies expéditions du partenaire
  const donneesGraphique = genererDonneesGraphique(shipments);
  const { line, area, coords } = buildChartPath(donneesGraphique.points, 320, 110);

  return (
    <div className={styles.app}>
      {navOpen && <div className={styles.backdrop} onClick={() => setNavOpen(false)} />}

      <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <Icon name="arrowUp" className={styles.logoMark} />
            GVIP
          </div>
          <button className={styles.closeNav} onClick={() => setNavOpen(false)} aria-label="Fermer le menu">
            <Icon name="close" className={styles.navIcon} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`${styles.navItem} ${section === item.key ? styles.navItemActive : ""}`}
              onClick={() => allerA(item.key)}
            >
              <Icon name={item.icon} className={styles.navIcon} />
              {item.label}
            </button>
          ))}
          <button className={styles.navItem} onClick={seDeconnecter}>
            <Icon name="close" className={styles.navIcon} />
            Se déconnecter
          </button>
        </nav>

        <div className={styles.referralCard}>
          <Icon name="truck" className={styles.referralIcon} />
          <p className={styles.referralTitle}>
            Plus de colis,
            <br />
            plus d&rsquo;opportunités !
          </p>
          <p className={styles.referralText}>Recommandez GVIP autour de vous et gagnez des commissions.</p>
          <button className={styles.referralButton}>
            En savoir plus <Icon name="arrowRight" className={styles.btnIcon} />
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} onClick={() => setNavOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" className={styles.navIcon} />
          </button>
          <div className={styles.searchSpace} />
          <div className={styles.profile}>
            <span className={styles.avatar}>{initials}</span>
            <span className={styles.profileText}>
              <strong>{profile.nom}</strong>
              <small>Transporteur partenaire</small>
            </span>
          </div>
        </header>

        <main className={styles.content}>
          {section === "dashboard" && (
            <div className={styles.contentGrid}>
              <div className={styles.leftColumn}>
                <section className={styles.hero}>
                  <div className={styles.heroLeft}>
                    <div className={styles.heroBadge}>
                      <Icon name="arrowUp" className={styles.heroBadgeIcon} />
                    </div>
                    <h1>Bonjour {profile.nom.split(" ")[0]},</h1>
                    <p className={styles.heroLead}>Merci d&rsquo;être partenaire de GVIP !</p>
                    <p className={styles.heroSub}>
                      Ensemble, facilitons le transport de colis entre la France et la Côte d&rsquo;Ivoire.
                    </p>
                  </div>
                  <div className={styles.heroRight}>
                    <h2>Votre espace partenaire</h2>
                    <p>Suivez vos expéditions, gérez vos livraisons et développez votre activité.</p>
                    <button className={styles.heroButton} onClick={() => allerA("expeditions")}>
                      Voir mes expéditions <Icon name="arrowRight" className={styles.btnIcon} />
                    </button>
                  </div>
                </section>

                <section className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="package" className={styles.statIconSvg} />
                    </span>
                    <div>
                      <p className={styles.statValue}>{shipments.filter((s) => s.statut === "En cours").length}</p>
                      <p className={styles.statLabel}>Expéditions en cours</p>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="coin" className={styles.statIconSvg} />
                    </span>
                    <div>
                      {/* NOUVEAU : estimation des revenus au lieu de "transactions" (toujours vide) */}
                      <p className={styles.statValue}>{estimationRevenus.toFixed(2)} €</p>
                      <p className={styles.statLabel}>Estimation des revenus</p>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="truck" className={styles.statIconSvg} />
                    </span>
                    <div>
                      <p className={styles.statValue}>{shipments.filter((s) => s.statut === "Livré").length}</p>
                      <p className={styles.statLabel}>Colis livrés</p>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="star" className={styles.statIconSvg} />
                    </span>
                    <div>
                      <p className={styles.statValue}>4,8/5</p>
                      <p className={styles.statLabel}>Note moyenne</p>
                    </div>
                  </div>
                </section>

                <section className={styles.panelsGrid}>
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <h3>Mes expéditions récentes</h3>
                      <div className={styles.panelHeaderActions}>
                        <button className={styles.addButton} onClick={ouvrirModal}>
                          <Icon name="plus" className={styles.linkIcon} />
                          Ajouter une expédition
                        </button>
                        <a href="#" className={styles.panelLink} onClick={(e) => { e.preventDefault(); allerA("expeditions"); }}>
                          Voir toutes <Icon name="arrowRight" className={styles.linkIcon} />
                        </a>
                      </div>
                    </div>
                    <div className={styles.tableScroll}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Destination</th>
                            <th>Poids</th>
                            <th>Statut</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {shipments.slice(0, 4).map((row) => (
                            <tr key={row.id}>
                              <td className={styles.dateCell}>
                                <Icon name="package" className={styles.rowIcon} />
                                {row.date}
                              </td>
                              <td>
                                {row.villeDepart} <Icon name="arrowRight" className={styles.routeIcon} /> {row.villeArrivee}
                              </td>
                              <td>{row.poids}</td>
                              <td>
                                <span className={`${styles.badge} ${styles[statusStyles[row.statut]]}`}>{row.statut}</span>
                              </td>
                              <td className={styles.chevronCell}>
                                <Icon name="chevronRight" className={styles.chevronIcon} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <h3>Vos performances</h3>
                    </div>
                    {/* NOUVEAU : graphique dynamique basé sur les vraies expéditions du partenaire */}
                    {donneesGraphique.vide ? (
                      <p style={{ color: "#6b7280", fontSize: 13.5, padding: "20px 0", textAlign: "center" }}>
                        Pas encore assez d'expéditions pour afficher un graphique.
                      </p>
                    ) : (
                      <>
                        <svg viewBox="0 0 320 110" className={styles.chart} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1f8a4c" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#1f8a4c" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d={area} fill="url(#chartFill)" />
                          <path d={line} fill="none" stroke="#1f8a4c" strokeWidth="2.5" />
                          {coords.map(([x, y], i) => (
                            <circle key={i} cx={x} cy={y} r="3" fill="#1f8a4c" />
                          ))}
                        </svg>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                          {donneesGraphique.labels.map((l, i) => (
                            <span key={i}>{l}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <section className={styles.newsSection}>
                  <div className={styles.panelHeader}>
                    <h3>Dernières actualités</h3>
                  </div>
                  <div className={styles.newsGrid}>
                    {news.map((n) => (
                      <article className={styles.newsCard} key={n.title}>
                        <div className={`${styles.newsThumb} ${styles[`newsThumb_${n.tone}`]}`}>
                          {n.tone === "ocean" ? (
                            <Icon name="ship" className={styles.newsThumbIcon} />
                          ) : n.tone === "boxes" ? (
                            <Icon name="package" className={styles.newsThumbIcon} />
                          ) : (
                            <span className={styles.newsThumbLogo}>GVIP</span>
                          )}
                        </div>
                        <p className={styles.newsDate}>{n.date}</p>
                        <h4>{n.title}</h4>
                        <p className={styles.newsText}>{n.text}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <aside className={styles.rightColumn}>
                <div className={styles.infoCard}>
                  <h3>
                    <Icon name="user" className={styles.infoHeaderIcon} />
                    Mes informations
                  </h3>
                  <ul className={styles.infoList}>
                    <li>
                      <Icon name="user" className={styles.infoIcon} />
                      <span>
                        <small>Nom</small>
                        <strong>{profile.nom}</strong>
                      </span>
                    </li>
                    <li>
                      <Icon name="wallet" className={styles.infoIcon} />
                      <span>
                        <small>Raison sociale</small>
                        <strong>{profile.nomEntreprise}</strong>
                      </span>
                    </li>
                    <li>
                      <Icon name="map" className={styles.infoIcon} />
                      <span>
                        <small>Pays d&rsquo;activité</small>
                        <strong>{profile.pays}</strong>
                      </span>
                    </li>
                  </ul>
                </div>

                <div className={styles.helpCard}>
                  <span className={styles.helpIconWrap}>
                    <Icon name="headset" className={styles.helpIcon} />
                  </span>
                  <h3>Besoin d&rsquo;aide ?</h3>
                  <p>Notre équipe est disponible pour répondre à toutes vos questions.</p>
                  <button className={styles.helpButton} onClick={() => allerA("support")}>
                    Contacter le support <Icon name="arrowRight" className={styles.btnIcon} />
                  </button>
                </div>
              </aside>
            </div>
          )}

          {section === "expeditions" && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Mes expéditions</h1>
                  <p className={styles.pageSubtitle}>{shipments.length} expéditions au total</p>
                </div>
                <button className={styles.addButton} onClick={ouvrirModal}>
                  <Icon name="plus" className={styles.linkIcon} />
                  Ajouter une expédition
                </button>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <Icon name="search" className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Rechercher par référence ou ville..."
                    value={expSearch}
                    onChange={(e) => setExpSearch(e.target.value)}
                  />
                </div>
                <div className={styles.filterChips}>
                  {expeditionFilters.map((f) => (
                    <button
                      key={f}
                      className={`${styles.chip} ${expFilter === f ? styles.chipActive : ""}`}
                      onClick={() => setExpFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Date</th>
                        <th>Destination</th>
                        <th>Poids</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.length === 0 && (
                        <tr>
                          <td colSpan={5} className={styles.emptyCell}>
                            Aucune expédition ne correspond à votre recherche.
                          </td>
                        </tr>
                      )}
                      {filteredShipments.map((row) => (
                        <tr key={row.id}>
                          <td className={styles.refCell}>{row.reference}</td>
                          <td className={styles.dateCell}>
                            <Icon name="package" className={styles.rowIcon} />
                            {row.date}
                          </td>
                          <td>
                            {row.villeDepart} <Icon name="arrowRight" className={styles.routeIcon} /> {row.villeArrivee}
                          </td>
                          <td>{row.poids}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[statusStyles[row.statut]]}`}>{row.statut}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {section === "revenus" && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Mes revenus</h1>
                  <p className={styles.pageSubtitle}>Suivez vos gains et vos retraits</p>
                </div>
                <button className={styles.addButton} onClick={() => setRetraitOuvert(true)}>
                  <Icon name="wallet" className={styles.linkIcon} />
                  Demander un retrait
                </button>
              </div>

              {/* NOUVEAU : estimation des revenus basée sur le tarif par kilo défini par le partenaire */}
              <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>
                    <Icon name="coin" className={styles.statIconSvg} />
                  </span>
                  <div>
                    <p className={styles.statValue}>{estimationRevenus.toFixed(2)} €</p>
                    <p className={styles.statLabel}>Estimation de vos revenus</p>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>
                    <Icon name="truck" className={styles.statIconSvg} />
                  </span>
                  <div>
                    <p className={styles.statValue}>{poidsLivreTotal.toFixed(1)} kg</p>
                    <p className={styles.statLabel}>Poids total livré</p>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>
                    <Icon name="wallet" className={styles.statIconSvg} />
                  </span>
                  <div>
                    <p className={styles.statValue}>{tarifKilo > 0 ? `${tarifKilo.toFixed(2)} €` : "Non défini"}</p>
                    <p className={styles.statLabel}>Votre tarif par kilo</p>
                  </div>
                </div>
              </section>

              <div className={styles.panel}>
                <p style={{ color: "#6b7280", fontSize: 13.5, marginBottom: 10 }}>
                  Cette estimation est calculée automatiquement à partir du poids total de vos
                  expéditions <strong>livrées</strong> et du tarif par kilo que vous avez défini
                  dans votre profil. Le montant réel versé peut différer une fois la branche
                  "transactions" connectée aux paiements automatiques.
                </p>
                {tarifKilo === 0 && (
                  <p style={{ color: "#c0392b", fontSize: 13.5, marginBottom: 10 }}>
                    Vous n'avez pas encore défini votre tarif par kilo, l'estimation reste donc à 0 €.
                  </p>
                )}
                <button className={styles.addButton} onClick={() => allerA("profil")}>
                  <Icon name="edit" className={styles.linkIcon} />
                  Modifier mon tarif par kilo
                </button>
              </div>
            </>
          )}

          {section === "profil" && profilForm && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Mon profil</h1>
                  <p className={styles.pageSubtitle}>Gérez vos informations personnelles et professionnelles</p>
                </div>
                {!profilEditMode && (
                  <button className={styles.addButton} onClick={() => setProfilEditMode(true)}>
                    <Icon name="edit" className={styles.linkIcon} />
                    Modifier
                  </button>
                )}
              </div>

              <div className={styles.profileGrid}>
                <div className={styles.avatarPanel}>
                  <div className={styles.avatarWrap}>
                    <span className={styles.profileAvatar}>{initials}</span>
                  </div>
                  <h3>{profile.nom}</h3>
                  <p className={styles.profileRole}>Transporteur partenaire</p>
                </div>

                <form className={styles.panel} onSubmit={enregistrerProfil}>
                  <h3 className={styles.panelTitleStandalone}>Informations générales</h3>
                  <div className={styles.fieldGrid}>
                    <div className={styles.field}>
                      <label>Nom complet</label>
                      {profilEditMode ? (
                        <input value={profilForm.nom} onChange={(e) => majChampProfil("nom", e.target.value)} required />
                      ) : (
                        <p>{profile.nom}</p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label>Raison sociale</label>
                      {profilEditMode ? (
                        <input value={profilForm.nomEntreprise} onChange={(e) => majChampProfil("nomEntreprise", e.target.value)} />
                      ) : (
                        <p>{profile.nomEntreprise}</p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label>Email</label>
                      <p>{profile.email}</p>
                    </div>
                    <div className={styles.field}>
                      <label>Téléphone</label>
                      {profilEditMode ? (
                        <input value={profilForm.telephone} onChange={(e) => majChampProfil("telephone", e.target.value)} />
                      ) : (
                        <p>{profile.telephone}</p>
                      )}
                    </div>
                    {/* NOUVEAU : tarif par kilo, fixé librement par chaque partenaire */}
                    <div className={styles.field}>
                      <label>Tarif par kilo (€)</label>
                      {profilEditMode ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={profilForm.tarifParKilo ?? ""}
                          onChange={(e) => majChampProfil("tarifParKilo", e.target.value)}
                          placeholder="Ex : 4.50"
                        />
                      ) : (
                        <p>{profile.tarifParKilo ? `${profile.tarifParKilo} € / kg` : "Non défini"}</p>
                      )}
                    </div>
                    <div className={`${styles.field} ${styles.fieldWide}`}>
                      <label>Adresse</label>
                      {profilEditMode ? (
                        <input value={profilForm.adresse} onChange={(e) => majChampProfil("adresse", e.target.value)} />
                      ) : (
                        <p>{profile.adresse}</p>
                      )}
                    </div>
                  </div>

                  {profilEditMode && (
                    <div className={styles.formActions}>
                      <button type="button" className={styles.modalCancel} onClick={annulerProfil}>
                        Annuler
                      </button>
                      <button type="submit" className={styles.modalSubmit}>
                        Enregistrer
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </>
          )}

          {section === "support" && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Support</h1>
                  <p className={styles.pageSubtitle}>Une question ? Notre équipe vous répond sous 24h</p>
                </div>
              </div>

              <div className={styles.supportMainGrid}>
                <div className={styles.panel}>
                  <h3 className={styles.panelTitleStandalone}>Questions fréquentes</h3>
                  <div className={styles.faqList}>
                    {faqs.map((f, i) => (
                      <div className={styles.faqItem} key={f.q}>
                        <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                          {f.q}
                          <Icon name={openFaq === i ? "chevronUp" : "chevronDown"} className={styles.faqIcon} />
                        </button>
                        {openFaq === i && <p className={styles.faqAnswer}>{f.a}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.panel}>
                  <h3 className={styles.panelTitleStandalone}>Contacter le support</h3>
                  {supportEnvoye && (
                    <div className={styles.successBanner}>
                      <Icon name="checkCircle" className={styles.successIcon} />
                      Votre message a bien été envoyé.
                    </div>
                  )}
                  <form className={styles.supportForm} onSubmit={envoyerSupport}>
                    <div className={styles.field}>
                      <label>Sujet</label>
                      <input
                        type="text"
                        required
                        value={supportForm.sujet}
                        onChange={(e) => majChampSupport("sujet", e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Message</label>
                      <textarea
                        required
                        rows={5}
                        value={supportForm.message}
                        onChange={(e) => majChampSupport("message", e.target.value)}
                      />
                    </div>
                    <button type="submit" className={styles.modalSubmit}>
                      Envoyer le message
                    </button>
                  </form>
                </div>
              </div>

              <div className={styles.panel}>
                <h3 className={styles.panelTitleStandalone}>Mes tickets</h3>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Sujet</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id}>
                          <td>{new Date(t.date).toLocaleDateString("fr-FR")}</td>
                          <td>{t.sujet}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[ticketStatusStyles[t.statut]]}`}>{t.statut}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={styles.footerLogo}>GVIP</span>
            <span>Votre partenaire transport</span>
          </div>
          <div className={styles.footerRight}>
            <span>© 2026 GVIP Colis. Tous droits réservés.</span>
          </div>
        </footer>
      </div>

      {modalOuvert && (
        <div className={styles.overlay} onClick={fermerModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Ajouter une expédition</h3>
              <button className={styles.modalClose} onClick={fermerModal} aria-label="Fermer">
                <Icon name="close" className={styles.navIcon} />
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={ajouterExpedition}>
              <div className={styles.modalField}>
                <label>Date</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : 14 septembre 2026"
                  value={formExpedition.date}
                  onChange={(e) => majChampExpedition("date", e.target.value)}
                />
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Ville de départ</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Paris"
                    value={formExpedition.from}
                    onChange={(e) => majChampExpedition("from", e.target.value)}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Ville d'arrivée</label>
                  <input
                    type="text"
                    required
                    value={formExpedition.to}
                    onChange={(e) => majChampExpedition("to", e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Poids</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : 10 kg"
                    value={formExpedition.weight}
                    onChange={(e) => majChampExpedition("weight", e.target.value)}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Statut</label>
                  <select value={formExpedition.status} onChange={(e) => majChampExpedition("status", e.target.value)}>
                    <option value="Planifié">Planifié</option>
                    <option value="En cours">En cours</option>
                    <option value="À récupérer">À récupérer</option>
                    <option value="Livré">Livré</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancel} onClick={fermerModal}>
                  Annuler
                </button>
                <button type="submit" className={styles.modalSubmit}>
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
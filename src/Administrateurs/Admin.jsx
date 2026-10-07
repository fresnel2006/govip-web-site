// ────────────────────────────────────────────────────────────────────────
//  src/Administrateurs/Admin.jsx  —  Espace administrateur GVIP
//
//  GVIP est l'intermédiaire entre les compagnies de transport et les
//  voyageurs. Cet espace permet à l'équipe GVIP de :
//    - enregistrer les compagnies (création de leur compte partenaire)
//    - voir et gérer toutes les compagnies (fiche, modification,
//      suspension / réactivation, mot de passe, suppression)
//    - suivre l'activité : expéditions, demandes de support, demandes
//      de partenariat reçues depuis la page d'accueil
//
//  Accès : compte Firebase Auth dont l'uid figure dans la branche
//  "admins" de la base (admins/<uid> = true).
// ────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FaBars, FaBoxOpen, FaBuilding, FaCheck, FaChartPie, FaCopy, FaEnvelopeOpenText, FaEye,
    FaEyeSlash, FaFileAlt, FaHeadset, FaKey, FaPause, FaPen, FaPlay, FaPlus, FaRedo, FaSearch,
    FaSignOutAlt, FaTimes, FaTrash, FaUserPlus, FaWeightHanging,
} from 'react-icons/fa';
import {
    connexionAdmin,
    deconnexionAdmin,
    ecouterEtatAuth,
    estAdmin,
    ecouterCompagnies,
    ecouterToutesExpeditions,
    ecouterTousTickets,
    ecouterDemandesPartenaires,
    creerCompagnie,
    modifierCompagnie,
    supprimerCompagnie,
    envoyerReinitialisationMotDePasse,
    modifierTicket,
    modifierDemandePartenaire,
    supprimerExpedition,
    masquerExpeditionsCompagnie,
    prochaineDateDepart,
    libelleFrequence,
    estDepartAffiche,
} from '../firebase/firebase.js';
import logo from '../assets/logo_entreprise.png';
import styles from './Admin.module.css';

// ████████████████████████████████████████████████████████████████████████
//  OUTILS ET BRIQUES D'INTERFACE
// ████████████████████████████████████████████████████████████████████████

// ── Textes et dates ──

const MOIS_FR = {
    janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
};

/** Minuscules sans accents, pour comparer ou rechercher du texte. */
function normaliser(texte) {
    return String(texte ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

/** Vrai si l'un des champs contient la recherche (sans tenir compte des accents). */
function correspond(recherche, ...champs) {
    const r = normaliser(recherche).trim();
    if (!r) return true;
    return champs.some((c) => normaliser(c).includes(r));
}

/**
 * Lit une date stockée sous n'importe quelle forme utilisée dans la base :
 * horodatage (nombre), "2025-05-06" ou texte libre "06 mai 2025".
 * @returns {Date|null}
 */
function lireDate(valeur) {
    if (valeur === undefined || valeur === null || valeur === '') return null;
    if (typeof valeur === 'number') return new Date(valeur);

    const texte = String(valeur);
    const iso = texte.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

    const fr = normaliser(texte).match(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/);
    if (fr && MOIS_FR[fr[2]] !== undefined) {
        return new Date(Number(fr[3]), MOIS_FR[fr[2]], Number(fr[1]));
    }
    return null;
}

/** "6 mai 2025" (ou le texte d'origine s'il n'est pas lisible). */
function formatDate(valeur) {
    const date = lireDate(valeur);
    if (!date || Number.isNaN(date.getTime())) return valeur ? String(valeur) : '—';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Extrait un nombre d'un champ saisi en texte libre (ex : "10 kg" → 10). */
function lireNombre(valeur) {
    if (typeof valeur === 'number') return valeur;
    const m = String(valeur ?? '').replace(',', '.').match(/[\d.]+/);
    return m ? parseFloat(m[0]) || 0 : 0;
}

function formatNombre(n) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
}

/** "Air Côte d'Ivoire" → "AC" */
function initiales(texte) {
    const mots = String(texte || '?').trim().split(/\s+/);
    return mots.map((m) => m[0]).join('').slice(0, 2).toUpperCase();
}

/** Nom à afficher pour une compagnie (nom de l'entreprise, sinon nom du responsable). */
function nomCompagnie(compagnie) {
    return compagnie?.nomEntreprise || compagnie?.nom || 'Compagnie inconnue';
}

/** Mot de passe aléatoire lisible (sans caractères ambigus). */
function genererMotDePasse() {
    const caracteres = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const valeurs = new Uint32Array(10);
    crypto.getRandomValues(valeurs);
    const base = Array.from(valeurs, (v) => caracteres[v % caracteres.length]).join('');
    return `${base.slice(0, 5)}-${base.slice(5)}`;
}

// ── Statuts ──

const STATUTS_EXPEDITION = ['Planifié', 'En cours', 'À récupérer', 'Livré'];

const TON_EXPEDITION = {
    'Planifié': 'gris',
    'En cours': 'bleu',
    'À récupérer': 'orange',
    'Livré': 'vert',
};

function tonExpedition(statut) {
    return TON_EXPEDITION[statut] || 'gris';
}

function estSuspendue(compagnie) {
    return compagnie?.statut === 'suspendu';
}

// ── Composants ──

function Badge({ ton = 'gris', children }) {
    return <span className={`${styles.badge} ${styles[`badge_${ton}`]}`}>{children}</span>;
}

function BadgeCompagnie({ compagnie }) {
    return estSuspendue(compagnie)
        ? <Badge ton="rouge">Suspendue</Badge>
        : <Badge ton="vert">Active</Badge>;
}

function Avatar({ texte, image, grand = false }) {
    if (image) {
        return <img src={image} alt="" className={`${styles.avatar} ${grand ? styles.avatar_grand : ''}`} style={{ objectFit: 'cover', padding: 0 }} />;
    }
    return (
        <span className={`${styles.avatar} ${grand ? styles.avatar_grand : ''}`} aria-hidden="true">
            {initiales(texte)}
        </span>
    );
}

function Indicateur({ label, valeur, detail, icone }) {
    return (
        <div className={`${styles.carte} ${styles.indicateur}`}>
            <div className={styles.indicateur_haut}>
                <span>{label}</span>
                <span className={styles.indicateur_icone}>{icone}</span>
            </div>
            <div className={styles.indicateur_valeur}>{valeur}</div>
            {detail && <div className={styles.indicateur_detail}>{detail}</div>}
        </div>
    );
}

function Carte({ titre, sousTitre, action, children, sansMarge = false }) {
    return (
        <section className={styles.carte}>
            {(titre || action) && (
                <div className={styles.carte_entete}>
                    <div>
                        {titre && <h2 className={styles.carte_titre}>{titre}</h2>}
                        {sousTitre && <p className={styles.carte_sous_titre}>{sousTitre}</p>}
                    </div>
                    {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
                </div>
            )}
            {sansMarge ? children : <div className={styles.carte_corps}>{children}</div>}
        </section>
    );
}

function BarreRecherche({ valeur, onChange, placeholder }) {
    return (
        <div className={styles.recherche}>
            <FaSearch size={13} />
            <input
                type="search"
                value={valeur}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
            />
        </div>
    );
}

function Filtres({ options, valeur, onChange }) {
    return (
        <div className={styles.filtres} role="group">
            {options.map((o) => (
                <button
                    key={o.valeur}
                    type="button"
                    className={`${styles.filtre} ${valeur === o.valeur ? styles.filtre_actif : ''}`}
                    onClick={() => onChange(o.valeur)}
                    aria-pressed={valeur === o.valeur}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function EtatVide({ icone, titre, texte, action }) {
    return (
        <div className={styles.etat_vide}>
            {icone && <div className={styles.etat_vide_icone}>{icone}</div>}
            <div className={styles.etat_vide_titre}>{titre}</div>
            {texte && <div>{texte}</div>}
            {action && <div style={{ marginTop: 10 }}>{action}</div>}
        </div>
    );
}

/** Ferme une fenêtre avec la touche Échap. */
function useEchap(onClose) {
    useEffect(() => {
        const gerer = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', gerer);
        return () => window.removeEventListener('keydown', gerer);
    }, [onClose]);
}

function Modale({ titre, description, onClose, children, pied, petite = false }) {
    useEchap(onClose);
    return (
        <div className={styles.voile} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div
                className={`${styles.modale} ${petite ? styles.modale_petite : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={titre}
            >
                <div className={styles.modale_entete}>
                    <div>
                        <h2 className={styles.modale_titre}>{titre}</h2>
                        {description && <p className={styles.modale_description}>{description}</p>}
                    </div>
                    <button type="button" className={`${styles.bouton_icone} ${styles.fermer}`} onClick={onClose} aria-label="Fermer">
                        <FaTimes />
                    </button>
                </div>
                <div className={styles.modale_corps}>{children}</div>
                {pied && <div className={styles.modale_pied}>{pied}</div>}
            </div>
        </div>
    );
}

/** Fenêtre de confirmation pour une action importante (suppression, suspension…). */
function Confirmation({ titre, message, libelle, danger = false, onConfirmer, onClose }) {
    const [enCours, setEnCours] = useState(false);

    const confirmer = async () => {
        setEnCours(true);
        try {
            await onConfirmer();
            onClose();
        } catch {
            setEnCours(false);
        }
    };

    return (
        <Modale
            titre={titre}
            onClose={enCours ? () => {} : onClose}
            petite
            pied={
                <>
                    <button type="button" className={styles.bouton} onClick={onClose} disabled={enCours}>
                        Annuler
                    </button>
                    <button
                        type="button"
                        className={`${styles.bouton} ${danger ? styles.bouton_danger : styles.bouton_principal}`}
                        onClick={confirmer}
                        disabled={enCours}
                    >
                        {enCours ? 'Veuillez patienter…' : libelle}
                    </button>
                </>
            }
        >
            <p style={{ margin: 0, color: 'var(--texte-2)', lineHeight: 1.6 }}>{message}</p>
        </Modale>
    );
}

function Tiroir({ onClose, entete, children }) {
    useEchap(onClose);
    return (
        <>
            <div className={styles.tiroir_voile} onClick={onClose} />
            <aside className={styles.tiroir} role="dialog" aria-modal="true">
                <div className={styles.tiroir_entete}>
                    {entete}
                    <button type="button" className={`${styles.bouton_icone} ${styles.fermer}`} onClick={onClose} aria-label="Fermer">
                        <FaTimes />
                    </button>
                </div>
                <div className={styles.tiroir_corps}>{children}</div>
            </aside>
        </>
    );
}

// ████████████████████████████████████████████████████████████████████████
//  PAGE « COMPAGNIES »
// ████████████████████████████████████████████████████████████████████████

const PAYS = ["Côte d'Ivoire", 'France'];

function traduireErreur(code) {
    const messages = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé par un autre compte.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
        'auth/network-request-failed': 'Problème de connexion internet.',
        'PERMISSION_DENIED': "La base de données a refusé l'opération (règles de sécurité).",
    };
    return messages[code] || 'Une erreur est survenue, réessayez.';
}

/** Statistiques d'expéditions regroupées par compagnie (clé = uid). */
function statistiquesParCompagnie(expeditions) {
    const stats = {};
    expeditions.forEach((e) => {
        const s = (stats[e.idPartenaire] ??= { total: 0, enCours: 0, livrees: 0, poids: 0 });
        s.total += 1;
        if (e.statut === 'Livré') s.livrees += 1;
        else s.enCours += 1;
        s.poids += lireNombre(e.poids);
    });
    return stats;
}

// ════════════════════════════════════════════════════════════════════════
//  Création d'une compagnie
// ════════════════════════════════════════════════════════════════════════

const FORMULAIRE_VIDE = {
    nomEntreprise: '',
    nom: '',
    email: '',
    telephone: '',
    pays: "Côte d'Ivoire",
    adresse: '',
};

function ModaleCreationCompagnie({ valeursInitiales, onClose, onCree }) {
    const [form, setForm] = useState(() => ({
        ...FORMULAIRE_VIDE,
        ...valeursInitiales,
        motDePasse: genererMotDePasse(),
    }));
    const [erreur, setErreur] = useState('');
    const [enCours, setEnCours] = useState(false);
    const [identifiants, setIdentifiants] = useState(null);
    const [copie, setCopie] = useState(false);

    const maj = (champ) => (e) => setForm((p) => ({ ...p, [champ]: e.target.value }));

    const soumettre = async (e) => {
        e.preventDefault();
        setErreur('');
        setEnCours(true);
        const donnees = {
            ...form,
            email: form.email.trim().toLowerCase(),
            motDePasse: form.motDePasse.trim(),
            nomEntreprise: form.nomEntreprise.trim(),
            nom: form.nom.trim(),
            telephone: form.telephone.trim(),
            adresse: form.adresse.trim(),
        };
        try {
            await creerCompagnie(donnees);
            setIdentifiants({ nom: donnees.nomEntreprise, email: donnees.email, motDePasse: donnees.motDePasse });
            onCree?.(donnees);
        } catch (err) {
            console.error('Erreur création compagnie :', err);
            setErreur(traduireErreur(err.code));
        } finally {
            setEnCours(false);
        }
    };

    const copierIdentifiants = async () => {
        const texte =
            `Bonjour, voici vos accès à l'espace partenaire GVIP :\n` +
            `Adresse : ${window.location.origin}/espace_partenaire\n` +
            `Email : ${identifiants.email}\n` +
            `Mot de passe : ${identifiants.motDePasse}`;
        try {
            await navigator.clipboard.writeText(texte);
            setCopie(true);
            setTimeout(() => setCopie(false), 2000);
        } catch {
            setCopie(false);
        }
    };

    // ── Étape 2 : compte créé, on affiche les identifiants à transmettre ──
    if (identifiants) {
        return (
            <Modale
                titre="Compagnie enregistrée"
                description={`Le compte de ${identifiants.nom} est prêt.`}
                onClose={onClose}
                pied={
                    <>
                        <button type="button" className={styles.bouton} onClick={copierIdentifiants}>
                            {copie ? <FaCheck /> : <FaCopy />} {copie ? 'Copié' : 'Copier le message'}
                        </button>
                        <button type="button" className={`${styles.bouton} ${styles.bouton_principal}`} onClick={onClose}>
                            Terminé
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className={styles.succes_icone}><FaCheck size={18} /></div>
                    <p style={{ margin: 0, color: 'var(--texte-2)' }}>
                        Transmettez ces identifiants à la compagnie. Le mot de passe ne sera
                        plus affiché après fermeture de cette fenêtre.
                    </p>
                    <div className={styles.identifiants}>
                        <div className={styles.identifiants_ligne}>
                            <span>Espace</span>
                            <code>{window.location.origin}/espace_partenaire</code>
                        </div>
                        <div className={styles.identifiants_ligne}>
                            <span>Email</span>
                            <code>{identifiants.email}</code>
                        </div>
                        <div className={styles.identifiants_ligne}>
                            <span>Mot de passe</span>
                            <code>{identifiants.motDePasse}</code>
                        </div>
                    </div>
                </div>
            </Modale>
        );
    }

    // ── Étape 1 : formulaire ──
    return (
        <Modale
            titre="Ajouter une compagnie"
            description="Un compte de connexion à l'espace partenaire sera créé pour elle."
            onClose={enCours ? () => {} : onClose}
            pied={
                <>
                    <button type="button" className={styles.bouton} onClick={onClose} disabled={enCours}>
                        Annuler
                    </button>
                    <button type="submit" form="form-compagnie" className={`${styles.bouton} ${styles.bouton_principal}`} disabled={enCours}>
                        {enCours ? 'Création…' : 'Créer la compagnie'}
                    </button>
                </>
            }
        >
            {erreur && <div className={styles.message_erreur}>{erreur}</div>}
            <form id="form-compagnie" className={styles.formulaire} onSubmit={soumettre}>
                <div className={`${styles.champ} ${styles.champ_large}`}>
                    <label htmlFor="c-entreprise">Nom de la compagnie *</label>
                    <input id="c-entreprise" required value={form.nomEntreprise} onChange={maj('nomEntreprise')} autoFocus />
                </div>
                <div className={styles.champ}>
                    <label htmlFor="c-nom">Nom du responsable *</label>
                    <input id="c-nom" required value={form.nom} onChange={maj('nom')} />
                </div>
                <div className={styles.champ}>
                    <label htmlFor="c-tel">Téléphone</label>
                    <input id="c-tel" type="tel" value={form.telephone} onChange={maj('telephone')} />
                </div>
                <div className={styles.champ}>
                    <label htmlFor="c-pays">Pays</label>
                    <select id="c-pays" value={form.pays} onChange={maj('pays')}>
                        {PAYS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className={styles.champ}>
                    <label htmlFor="c-adresse">Adresse</label>
                    <input id="c-adresse" value={form.adresse} onChange={maj('adresse')} />
                </div>
                <div className={`${styles.champ} ${styles.champ_large}`}>
                    <label htmlFor="c-email">Email de connexion *</label>
                    <input id="c-email" type="email" required value={form.email} onChange={maj('email')} />
                </div>
                <div className={`${styles.champ} ${styles.champ_large}`}>
                    <label htmlFor="c-mdp">Mot de passe provisoire *</label>
                    <div className={styles.champ_groupe}>
                        <input id="c-mdp" required minLength={6} value={form.motDePasse} onChange={maj('motDePasse')} />
                        <button type="button" className={styles.bouton} onClick={() => setForm((p) => ({ ...p, motDePasse: genererMotDePasse() }))}>
                            Générer
                        </button>
                    </div>
                    <span className={styles.champ_aide}>La compagnie pourra le changer avec « mot de passe oublié ».</span>
                </div>
            </form>
        </Modale>
    );
}

// ════════════════════════════════════════════════════════════════════════
//  Modification d'une compagnie
// ════════════════════════════════════════════════════════════════════════

function ModaleModification({ compagnie, onClose, notifier }) {
    const [form, setForm] = useState({
        nomEntreprise: compagnie.nomEntreprise || '',
        nom: compagnie.nom || '',
        telephone: compagnie.telephone || '',
        pays: compagnie.pays || PAYS[0],
        adresse: compagnie.adresse || '',
        tarifParKilo: compagnie.tarifParKilo ?? 0,
    });
    const [erreur, setErreur] = useState('');
    const [enCours, setEnCours] = useState(false);

    const maj = (champ) => (e) => setForm((p) => ({ ...p, [champ]: e.target.value }));

    const soumettre = async (e) => {
        e.preventDefault();
        setErreur('');
        setEnCours(true);
        try {
            await modifierCompagnie(compagnie.id, {
                nomEntreprise: form.nomEntreprise.trim(),
                nom: form.nom.trim(),
                telephone: form.telephone.trim(),
                pays: form.pays,
                adresse: form.adresse.trim(),
                tarifParKilo: parseFloat(String(form.tarifParKilo).replace(',', '.')) || 0,
            });
            notifier('Fiche de la compagnie mise à jour.');
            onClose();
        } catch (err) {
            console.error('Erreur modification compagnie :', err);
            setErreur(traduireErreur(err.code));
            setEnCours(false);
        }
    };

    // garde le pays actuel même s'il ne fait pas partie de la liste
    const optionsPays = PAYS.includes(form.pays) ? PAYS : [form.pays, ...PAYS];

    return (
        <Modale
            titre="Modifier la compagnie"
            description={nomCompagnie(compagnie)}
            onClose={enCours ? () => {} : onClose}
            pied={
                <>
                    <button type="button" className={styles.bouton} onClick={onClose} disabled={enCours}>Annuler</button>
                    <button type="submit" form="form-modif" className={`${styles.bouton} ${styles.bouton_principal}`} disabled={enCours}>
                        {enCours ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                </>
            }
        >
            {erreur && <div className={styles.message_erreur}>{erreur}</div>}
            <form id="form-modif" className={styles.formulaire} onSubmit={soumettre}>
                <div className={`${styles.champ} ${styles.champ_large}`}>
                    <label htmlFor="m-entreprise">Nom de la compagnie *</label>
                    <input id="m-entreprise" required value={form.nomEntreprise} onChange={maj('nomEntreprise')} />
                </div>
                <div className={styles.champ}>
                    <label htmlFor="m-nom">Nom du responsable *</label>
                    <input id="m-nom" required value={form.nom} onChange={maj('nom')} />
                </div>
                <div className={styles.champ}>
                    <label htmlFor="m-tel">Téléphone</label>
                    <input id="m-tel" type="tel" value={form.telephone} onChange={maj('telephone')} />
                </div>
                <div className={styles.champ}>
                    <label htmlFor="m-pays">Pays</label>
                    <select id="m-pays" value={form.pays} onChange={maj('pays')}>
                        {optionsPays.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className={styles.champ}>
                    <label htmlFor="m-tarif">Tarif par kilo (€)</label>
                    <input id="m-tarif" inputMode="decimal" value={form.tarifParKilo} onChange={maj('tarifParKilo')} />
                </div>
                <div className={`${styles.champ} ${styles.champ_large}`}>
                    <label htmlFor="m-adresse">Adresse</label>
                    <input id="m-adresse" value={form.adresse} onChange={maj('adresse')} />
                </div>
                <div className={`${styles.champ} ${styles.champ_large}`}>
                    <label htmlFor="m-email">Email de connexion</label>
                    <input id="m-email" value={compagnie.email || ''} disabled />
                    <span className={styles.champ_aide}>L'email de connexion ne peut être changé que depuis la console Firebase.</span>
                </div>
            </form>
        </Modale>
    );
}

// ════════════════════════════════════════════════════════════════════════
//  Fiche détaillée (tiroir latéral)
// ════════════════════════════════════════════════════════════════════════

function FicheCompagnie({ compagnie, expeditions, tickets, onClose, onAction }) {
    const sesExpeditions = useMemo(
        () => expeditions
            .filter((e) => e.idPartenaire === compagnie.id)
            .sort((a, b) => (lireDate(b.date)?.getTime() || 0) - (lireDate(a.date)?.getTime() || 0)),
        [expeditions, compagnie.id]
    );
    const sesTickets = tickets.filter((t) => t.idPartenaire === compagnie.id);
    const ticketsOuverts = sesTickets.filter((t) => t.statut !== 'Résolu').length;
    const livrees = sesExpeditions.filter((e) => e.statut === 'Livré').length;
    const poids = sesExpeditions.reduce((s, e) => s + lireNombre(e.poids), 0);
    const suspendue = estSuspendue(compagnie);

    const infos = [
        ['Responsable', compagnie.nom],
        ['Email', compagnie.email],
        ['Téléphone', compagnie.telephone],
        ['Pays', compagnie.pays],
        ['Adresse', compagnie.adresse],
        ...(compagnie.description ? [['Description', compagnie.description]] : []),
        ['Tarif par kilo', compagnie.tarifParKilo ? `${formatNombre(compagnie.tarifParKilo)} €` : 'Non défini'],
        ['Inscrite le', formatDate(compagnie.dateInscription)],
        ['Identifiant', compagnie.id],
    ];

    return (
        <Tiroir
            onClose={onClose}
            entete={
                <>
                    <Avatar texte={nomCompagnie(compagnie)} image={compagnie.logoUrl} grand />
                    <div style={{ minWidth: 0 }}>
                        <h2 className={styles.modale_titre}>{nomCompagnie(compagnie)}</h2>
                        <div style={{ marginTop: 6 }}><BadgeCompagnie compagnie={compagnie} /></div>
                    </div>
                </>
            }
        >
            <div className={styles.tiroir_actions}>
                <button type="button" className={`${styles.bouton} ${styles.bouton_petit}`} onClick={() => onAction('modifier', compagnie)}>
                    <FaPen size={11} /> Modifier
                </button>
                <button type="button" className={`${styles.bouton} ${styles.bouton_petit}`} onClick={() => onAction('statut', compagnie)}>
                    {suspendue ? <FaPlay size={11} /> : <FaPause size={11} />} {suspendue ? 'Réactiver' : 'Suspendre'}
                </button>
                <button type="button" className={`${styles.bouton} ${styles.bouton_petit}`} onClick={() => onAction('motDePasse', compagnie)}>
                    <FaKey size={11} /> Réinitialiser le mot de passe
                </button>
                <button type="button" className={`${styles.bouton} ${styles.bouton_petit}`} style={{ color: 'var(--rouge)' }} onClick={() => onAction('supprimer', compagnie)}>
                    <FaTrash size={11} /> Supprimer
                </button>
            </div>

            <div className={styles.mini_indicateurs}>
                <div className={styles.mini_indicateur}><strong>{sesExpeditions.length}</strong><span>expéditions</span></div>
                <div className={styles.mini_indicateur}><strong>{livrees}</strong><span>livrées</span></div>
                <div className={styles.mini_indicateur}><strong>{formatNombre(poids)}</strong><span>kg transportés</span></div>
            </div>

            <div>
                <h3 className={styles.section_titre}>Informations</h3>
                <div className={styles.fiche_grille}>
                    {infos.map(([label, valeur]) => (
                        <div key={label}>
                            <div className={styles.fiche_label}>{label}</div>
                            <div className={styles.fiche_valeur}>{valeur || '—'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className={styles.section_titre}>Dernières expéditions</h3>
                {sesExpeditions.length === 0 ? (
                    <p className={styles.texte_discret} style={{ margin: 0 }}>Aucune expédition enregistrée.</p>
                ) : (
                    <ul className={styles.liste}>
                        {sesExpeditions.slice(0, 6).map((e) => (
                            <li key={e.id} className={styles.liste_element}>
                                <div className={styles.liste_texte}>
                                    <div className={styles.liste_principal}>{e.villeDepart || '?'} → {e.villeArrivee || '?'}</div>
                                    <div className={styles.liste_secondaire}>{e.reference} · {formatDate(e.date)} · {e.poids || '—'}</div>
                                </div>
                                <Badge ton={tonExpedition(e.statut)}>{e.statut || '—'}</Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h3 className={styles.section_titre}>Support</h3>
                <p className={styles.texte_discret} style={{ margin: 0 }}>
                    {sesTickets.length === 0
                        ? 'Aucune demande de support.'
                        : `${sesTickets.length} demande(s) de support, dont ${ticketsOuverts} en cours.`}
                </p>
            </div>
        </Tiroir>
    );
}

// ════════════════════════════════════════════════════════════════════════
//  Page principale
// ════════════════════════════════════════════════════════════════════════

const OPTIONS_FILTRE = [
    { valeur: 'toutes', label: 'Toutes' },
    { valeur: 'actives', label: 'Actives' },
    { valeur: 'suspendues', label: 'Suspendues' },
];

function Compagnies({ compagnies, expeditions, tickets, chargement, notifier, onAjouter }) {
    const [recherche, setRecherche] = useState('');
    const [filtre, setFiltre] = useState('toutes');
    const [pays, setPays] = useState('tous');
    const [idOuverte, setIdOuverte] = useState(null);
    const [enModification, setEnModification] = useState(null);
    const [confirmation, setConfirmation] = useState(null);

    const stats = useMemo(() => statistiquesParCompagnie(expeditions), [expeditions]);
    const listePays = useMemo(
        () => [...new Set(compagnies.map((c) => c.pays).filter(Boolean))].sort(),
        [compagnies]
    );

    const visibles = useMemo(
        () => compagnies
            .filter((c) => filtre === 'toutes' || (filtre === 'suspendues') === estSuspendue(c))
            .filter((c) => pays === 'tous' || c.pays === pays)
            .filter((c) => correspond(recherche, c.nomEntreprise, c.nom, c.email, c.telephone, c.pays))
            .sort((a, b) => (b.dateInscription || 0) - (a.dateInscription || 0)),
        [compagnies, filtre, pays, recherche]
    );

    // la fiche suit les mises à jour en temps réel de la compagnie ouverte
    const compagnieOuverte = compagnies.find((c) => c.id === idOuverte) || null;

    const lancerAction = (action, compagnie) => {
        const nom = nomCompagnie(compagnie);
        if (action === 'modifier') {
            setEnModification(compagnie);
        } else if (action === 'statut') {
            const suspendue = estSuspendue(compagnie);
            setConfirmation({
                titre: suspendue ? 'Réactiver la compagnie ?' : 'Suspendre la compagnie ?',
                message: suspendue
                    ? `${nom} pourra de nouveau accéder à son espace partenaire, et ses départs seront de nouveau affichés sur le site.`
                    : `${nom} ne pourra plus accéder à son espace partenaire et ses départs ne seront plus affichés sur le site tant que vous ne l'aurez pas réactivée. Ses données sont conservées.`,
                libelle: suspendue ? 'Réactiver' : 'Suspendre',
                danger: !suspendue,
                onConfirmer: async () => {
                    try {
                        await modifierCompagnie(compagnie.id, { statut: suspendue ? 'actif' : 'suspendu' });
                        // ses expéditions disparaissent de l'accueil pendant la suspension
                        await masquerExpeditionsCompagnie(compagnie.id, !suspendue);
                        notifier(suspendue ? `${nom} a été réactivée.` : `${nom} a été suspendue.`);
                    } catch (err) {
                        notifier(traduireErreur(err.code), 'erreur');
                        throw err;
                    }
                },
            });
        } else if (action === 'motDePasse') {
            setConfirmation({
                titre: 'Réinitialiser le mot de passe ?',
                message: `Un email sera envoyé à ${compagnie.email} avec un lien pour choisir un nouveau mot de passe.`,
                libelle: "Envoyer l'email",
                onConfirmer: async () => {
                    try {
                        await envoyerReinitialisationMotDePasse(compagnie.email);
                        notifier(`Email de réinitialisation envoyé à ${compagnie.email}.`);
                    } catch (err) {
                        notifier(traduireErreur(err.code), 'erreur');
                        throw err;
                    }
                },
            });
        } else if (action === 'supprimer') {
            setConfirmation({
                titre: 'Supprimer la compagnie ?',
                message: `La fiche de ${nom} sera supprimée et elle n'aura plus accès à son espace. Ses expéditions restent dans l'historique mais ne sont plus affichées sur le site. Cette action est définitive.`,
                libelle: 'Supprimer définitivement',
                danger: true,
                onConfirmer: async () => {
                    try {
                        await masquerExpeditionsCompagnie(compagnie.id, true);
                        await supprimerCompagnie(compagnie.id);
                        setIdOuverte(null);
                        notifier(`${nom} a été supprimée.`);
                    } catch (err) {
                        notifier(traduireErreur(err.code), 'erreur');
                        throw err;
                    }
                },
            });
        }
    };

    return (
        <>
            <Carte sansMarge>
                <div className={styles.barre_outils}>
                    <BarreRecherche
                        valeur={recherche}
                        onChange={setRecherche}
                        placeholder="Rechercher une compagnie, un email, un téléphone…"
                    />
                    <Filtres options={OPTIONS_FILTRE} valeur={filtre} onChange={setFiltre} />
                    {listePays.length > 1 && (
                        <select className={styles.selecteur} value={pays} onChange={(e) => setPays(e.target.value)} aria-label="Filtrer par pays">
                            <option value="tous">Tous les pays</option>
                            {listePays.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    )}
                </div>

                {chargement ? (
                    <EtatVide titre="Chargement des compagnies…" />
                ) : visibles.length === 0 ? (
                    compagnies.length === 0 ? (
                        <EtatVide
                            icone={<FaBuilding size={20} />}
                            titre="Aucune compagnie enregistrée"
                            texte="Ajoutez votre première compagnie de transport pour commencer."
                            action={
                                <button type="button" className={`${styles.bouton} ${styles.bouton_principal}`} onClick={() => onAjouter()}>
                                    <FaPlus size={12} /> Ajouter une compagnie
                                </button>
                            }
                        />
                    ) : (
                        <EtatVide icone={<FaBuilding size={20} />} titre="Aucun résultat" texte="Aucune compagnie ne correspond à ces critères." />
                    )
                ) : (
                    <div className={styles.tableau_conteneur}>
                        <table className={styles.tableau}>
                            <thead>
                                <tr>
                                    <th>Compagnie</th>
                                    <th className={styles.colonne_secondaire}>Contact</th>
                                    <th className={styles.colonne_secondaire}>Pays</th>
                                    <th className={styles.colonne_secondaire} style={{ textAlign: 'right' }}>Expéditions</th>
                                    <th className={styles.colonne_secondaire}>Inscrite le</th>
                                    <th>Statut</th>
                                    <th aria-label="Actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map((c) => {
                                    const s = stats[c.id];
                                    const suspendue = estSuspendue(c);
                                    return (
                                        <tr key={c.id} className={styles.ligne_cliquable} onClick={() => setIdOuverte(c.id)}>
                                            <td>
                                                <div className={styles.cellule_compagnie}>
                                                    <Avatar texte={nomCompagnie(c)} image={c.logoUrl} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className={styles.liste_principal}>{nomCompagnie(c)}</div>
                                                        <div className={styles.liste_secondaire}>{c.nom}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles.colonne_secondaire}>
                                                <div>{c.email}</div>
                                                <div className={styles.texte_discret}>{c.telephone || '—'}</div>
                                            </td>
                                            <td className={styles.colonne_secondaire}>{c.pays || '—'}</td>
                                            <td className={`${styles.colonne_secondaire} ${styles.nombre}`} style={{ textAlign: 'right' }}>
                                                {s?.total || 0}
                                                {s?.enCours ? <div className={styles.texte_discret}>{s.enCours} en cours</div> : null}
                                            </td>
                                            <td className={`${styles.colonne_secondaire} ${styles.texte_discret}`}>{formatDate(c.dateInscription)}</td>
                                            <td><BadgeCompagnie compagnie={c} /></td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className={styles.actions_ligne}>
                                                    <button type="button" className={styles.bouton_icone} title="Voir la fiche" aria-label="Voir la fiche" onClick={() => setIdOuverte(c.id)}>
                                                        <FaEye size={14} />
                                                    </button>
                                                    <button type="button" className={styles.bouton_icone} title="Modifier" aria-label="Modifier" onClick={() => lancerAction('modifier', c)}>
                                                        <FaPen size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={styles.bouton_icone}
                                                        title={suspendue ? 'Réactiver' : 'Suspendre'}
                                                        aria-label={suspendue ? 'Réactiver' : 'Suspendre'}
                                                        onClick={() => lancerAction('statut', c)}
                                                    >
                                                        {suspendue ? <FaPlay size={11} /> : <FaPause size={11} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!chargement && compagnies.length > 0 && (
                    <div className={styles.pied_tableau}>
                        {visibles.length} compagnie(s) affichée(s) sur {compagnies.length}
                    </div>
                )}
            </Carte>

            {compagnieOuverte && (
                <FicheCompagnie
                    compagnie={compagnieOuverte}
                    expeditions={expeditions}
                    tickets={tickets}
                    onClose={() => setIdOuverte(null)}
                    onAction={lancerAction}
                />
            )}
            {enModification && (
                <ModaleModification compagnie={enModification} onClose={() => setEnModification(null)} notifier={notifier} />
            )}
            {confirmation && <Confirmation {...confirmation} onClose={() => setConfirmation(null)} />}
        </>
    );
}

// ████████████████████████████████████████████████████████████████████████
//  PAGE « VUE D'ENSEMBLE »
// ████████████████████████████████████████████████████████████████████████

const NB_MOIS = 6;

/** Nombre d'expéditions par mois sur les NB_MOIS derniers mois (mois vides inclus). */
function expeditionsParMois(expeditions) {
    const maintenant = new Date();
    const mois = Array.from({ length: NB_MOIS }, (_, i) => {
        const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - (NB_MOIS - 1 - i), 1);
        return {
            cle: `${d.getFullYear()}-${d.getMonth()}`,
            court: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
            long: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
            total: 0,
            poids: 0,
        };
    });
    const index = Object.fromEntries(mois.map((m, i) => [m.cle, i]));
    expeditions.forEach((e) => {
        const d = lireDate(e.date);
        if (!d) return;
        const i = index[`${d.getFullYear()}-${d.getMonth()}`];
        if (i === undefined) return;
        mois[i].total += 1;
        mois[i].poids += lireNombre(e.poids);
    });
    return mois;
}

/** Graduation "ronde" de l'axe vertical : 4 intervalles égaux. */
function graduations(max) {
    const pas = Math.max(1, Math.ceil(max / 4));
    return [4, 3, 2, 1, 0].map((n) => n * pas);
}

function GraphiqueMensuel({ donnees }) {
    const max = Math.max(...donnees.map((d) => d.total), 0);
    const echelle = graduations(max);
    const plafond = echelle[0];

    return (
        <div className={styles.graphique} role="img" aria-label="Nombre d'expéditions par mois">
            <div className={styles.graphique_grille}>
                {echelle.map((v) => (
                    <div key={v} className={styles.graphique_ligne}><span>{v}</span></div>
                ))}
            </div>
            {donnees.map((d) => (
                <div key={d.cle} className={styles.graphique_colonne}>
                    <div className={styles.graphique_piste}>
                        <div
                            className={styles.graphique_barre}
                            style={{ height: `${(d.total / plafond) * 100}%`, opacity: d.total ? 1 : 0 }}
                        />
                    </div>
                    <div className={styles.graphique_mois}>{d.court}</div>
                    <div className={styles.graphique_infobulle}>
                        <strong style={{ textTransform: 'capitalize' }}>{d.long}</strong><br />
                        {d.total} expédition(s) · {formatNombre(d.poids)} kg
                    </div>
                </div>
            ))}
        </div>
    );
}

function VueEnsemble({ compagnies, expeditions, tickets, demandes, allerA }) {
    const actives = compagnies.filter((c) => !estSuspendue(c)).length;
    const suspendues = compagnies.length - actives;
    const enCours = expeditions.filter((e) => e.statut !== 'Livré').length;
    const poidsLivre = expeditions
        .filter((e) => e.statut === 'Livré')
        .reduce((s, e) => s + lireNombre(e.poids), 0);
    const poidsTotal = expeditions.reduce((s, e) => s + lireNombre(e.poids), 0);
    const ticketsOuverts = tickets.filter((t) => t.statut !== 'Résolu').length;
    const demandesEnAttente = demandes.filter((d) => !d.traitee).length;

    const parMois = useMemo(() => expeditionsParMois(expeditions), [expeditions]);
    const totalPeriode = parMois.reduce((s, m) => s + m.total, 0);

    const classement = useMemo(() => {
        const stats = statistiquesParCompagnie(expeditions);
        return compagnies
            .map((c) => ({ compagnie: c, total: stats[c.id]?.total || 0 }))
            .filter((x) => x.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [compagnies, expeditions]);
    const maxClassement = classement[0]?.total || 1;

    const nomsParId = useMemo(
        () => Object.fromEntries(compagnies.map((c) => [c.id, nomCompagnie(c)])),
        [compagnies]
    );

    const dernieresInscriptions = [...compagnies]
        .sort((a, b) => (b.dateInscription || 0) - (a.dateInscription || 0))
        .slice(0, 5);

    const dernieresExpeditions = [...expeditions]
        .sort((a, b) => (lireDate(b.date)?.getTime() || 0) - (lireDate(a.date)?.getTime() || 0))
        .slice(0, 5);

    return (
        <>
            <div className={styles.grille_indicateurs}>
                <Indicateur
                    label="Compagnies actives"
                    valeur={actives}
                    detail={suspendues ? `${suspendues} suspendue(s)` : `${compagnies.length} au total`}
                    icone={<FaBuilding size={15} />}
                />
                <Indicateur
                    label="Expéditions"
                    valeur={expeditions.length}
                    detail={`${enCours} en cours`}
                    icone={<FaBoxOpen size={15} />}
                />
                <Indicateur
                    label="Kilos transportés"
                    valeur={formatNombre(poidsTotal)}
                    detail={`${formatNombre(poidsLivre)} kg déjà livrés`}
                    icone={<FaWeightHanging size={14} />}
                />
                <Indicateur
                    label="À traiter"
                    valeur={ticketsOuverts + demandesEnAttente}
                    detail={`${ticketsOuverts} support · ${demandesEnAttente} demande(s)`}
                    icone={<FaHeadset size={15} />}
                />
            </div>

            <div className={styles.grille_deux}>
                <Carte
                    titre="Expéditions par mois"
                    sousTitre={`${totalPeriode} expédition(s) sur les ${NB_MOIS} derniers mois, toutes compagnies`}
                >
                    <GraphiqueMensuel donnees={parMois} />
                </Carte>

                <Carte
                    titre="Compagnies les plus actives"
                    sousTitre="Par nombre d'expéditions"
                    action={<button type="button" className={styles.bouton_lien} onClick={() => allerA('compagnies')}>Tout voir</button>}
                >
                    {classement.length === 0 ? (
                        <EtatVide titre="Pas encore d'activité" texte="Les compagnies n'ont enregistré aucune expédition." />
                    ) : (
                        <ul className={styles.liste}>
                            {classement.map(({ compagnie, total }) => (
                                <li key={compagnie.id} className={styles.liste_element}>
                                    <Avatar texte={nomCompagnie(compagnie)} image={compagnie.logoUrl} />
                                    <div className={styles.liste_texte}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                            <span className={styles.liste_principal}>{nomCompagnie(compagnie)}</span>
                                            <span className={styles.classement_valeur}>{total}</span>
                                        </div>
                                        <div className={styles.classement_barre}>
                                            <div className={styles.classement_remplissage} style={{ width: `${(total / maxClassement) * 100}%` }} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Carte>
            </div>

            <div className={styles.grille_deux}>
                <Carte
                    titre="Dernières expéditions"
                    action={<button type="button" className={styles.bouton_lien} onClick={() => allerA('expeditions')}>Tout voir</button>}
                >
                    {dernieresExpeditions.length === 0 ? (
                        <EtatVide titre="Aucune expédition" />
                    ) : (
                        <ul className={styles.liste}>
                            {dernieresExpeditions.map((e) => (
                                <li key={e.id} className={styles.liste_element}>
                                    <div className={styles.liste_texte}>
                                        <div className={styles.liste_principal}>{e.villeDepart || '?'} → {e.villeArrivee || '?'}</div>
                                        <div className={styles.liste_secondaire}>
                                            {nomsParId[e.idPartenaire] || 'Compagnie supprimée'} · {formatDate(e.date)} · {e.poids || '—'}
                                        </div>
                                    </div>
                                    <Badge ton={tonExpedition(e.statut)}>{e.statut || '—'}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Carte>

                <Carte
                    titre="Dernières compagnies inscrites"
                    action={<button type="button" className={styles.bouton_lien} onClick={() => allerA('compagnies')}>Tout voir</button>}
                >
                    {dernieresInscriptions.length === 0 ? (
                        <EtatVide titre="Aucune compagnie" />
                    ) : (
                        <ul className={styles.liste}>
                            {dernieresInscriptions.map((c) => (
                                <li key={c.id} className={styles.liste_element}>
                                    <Avatar texte={nomCompagnie(c)} image={c.logoUrl} />
                                    <div className={styles.liste_texte}>
                                        <div className={styles.liste_principal}>{nomCompagnie(c)}</div>
                                        <div className={styles.liste_secondaire}>{c.pays || '—'} · {formatDate(c.dateInscription)}</div>
                                    </div>
                                    <BadgeCompagnie compagnie={c} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Carte>
            </div>
        </>
    );
}

// ████████████████████████████████████████████████████████████████████████
//  PAGES « EXPÉDITIONS », « SUPPORT » ET « DEMANDES REÇUES »
// ████████████████████████████████████████████████████████████████████████

function useNomsCompagnies(compagnies) {
    return useMemo(
        () => Object.fromEntries(compagnies.map((c) => [c.id, nomCompagnie(c)])),
        [compagnies]
    );
}

const parDateDecroissante = (champ) => (a, b) =>
    (lireDate(b[champ])?.getTime() || 0) - (lireDate(a[champ])?.getTime() || 0);

// ════════════════════════════════════════════════════════════════════════
//  Expéditions
// ════════════════════════════════════════════════════════════════════════

// Prochaine date (expédition récurrente) ou date d'origine, pour trier du plus récent au plus ancien
const dateTri = (e) => (e.prochaine || lireDate(e.date))?.getTime() || 0;

// Les expéditions « Planifié » à venir sont affichées comme départs sur la page d'accueil.
function Expeditions({ expeditions, compagnies, notifier }) {
    const [recherche, setRecherche] = useState('');
    const [statut, setStatut] = useState('tous');
    const [idCompagnie, setIdCompagnie] = useState('toutes');
    const [aRetirer, setARetirer] = useState(null);
    const noms = useNomsCompagnies(compagnies);

    const options = [
        { valeur: 'tous', label: 'Tous' },
        { valeur: 'accueil', label: "Sur l'accueil" },
        ...STATUTS_EXPEDITION.map((s) => ({ valeur: s, label: s })),
    ];

    const visibles = useMemo(
        () => expeditions
            .map((e) => ({ ...e, prochaine: prochaineDateDepart(e) }))
            .filter((e) => statut === 'tous' || (statut === 'accueil' ? estDepartAffiche(e) : e.statut === statut))
            .filter((e) => idCompagnie === 'toutes' || e.idPartenaire === idCompagnie)
            .filter((e) => correspond(recherche, e.reference, e.villeDepart, e.villeArrivee, e.paysDepart, e.paysArrivee, noms[e.idPartenaire], e.nomCompagnie))
            .sort((a, b) => dateTri(b) - dateTri(a)),
        [expeditions, statut, idCompagnie, recherche, noms]
    );

    return (
        <>
            <Carte sansMarge>
                <div className={styles.barre_outils}>
                    <BarreRecherche valeur={recherche} onChange={setRecherche} placeholder="Référence, ville, compagnie…" />
                    <Filtres options={options} valeur={statut} onChange={setStatut} />
                    <select className={styles.selecteur} value={idCompagnie} onChange={(e) => setIdCompagnie(e.target.value)} aria-label="Filtrer par compagnie">
                        <option value="toutes">Toutes les compagnies</option>
                        {compagnies.map((c) => <option key={c.id} value={c.id}>{nomCompagnie(c)}</option>)}
                    </select>
                </div>
                {visibles.length === 0 ? (
                    <EtatVide
                        icone={<FaBoxOpen size={20} />}
                        titre={expeditions.length === 0 ? 'Aucune expédition' : 'Aucun résultat'}
                        texte={expeditions.length === 0
                            ? 'Les expéditions ajoutées par les compagnies dans leur espace partenaire apparaîtront ici.'
                            : 'Aucune expédition ne correspond à ces critères.'}
                    />
                ) : (
                    <div className={styles.tableau_conteneur}>
                        <table className={styles.tableau}>
                            <thead>
                                <tr>
                                    <th>Départ</th>
                                    <th>Trajet</th>
                                    <th className={styles.colonne_secondaire}>Compagnie</th>
                                    <th className={styles.colonne_secondaire}>Fréquence</th>
                                    <th className={styles.colonne_secondaire} style={{ textAlign: 'right' }}>Limite · Tarif</th>
                                    <th className={styles.colonne_secondaire} style={{ textAlign: 'right' }}>Poids</th>
                                    <th>Statut</th>
                                    <th aria-label="Actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map((e) => (
                                    <tr key={e.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <div style={{ fontWeight: 500 }}>{formatDate(e.prochaine ? e.prochaine.getTime() : e.date)}</div>
                                            <div className={styles.texte_discret}>{[e.heure, e.reference].filter(Boolean).join(' · ') || '—'}</div>
                                        </td>
                                        <td>
                                            <div>{e.villeDepart || '?'} → {e.villeArrivee || '?'}</div>
                                            {(e.paysDepart || e.paysArrivee) && (
                                                <div className={styles.texte_discret}>{e.paysDepart} → {e.paysArrivee}</div>
                                            )}
                                        </td>
                                        <td className={styles.colonne_secondaire}>{noms[e.idPartenaire] || e.nomCompagnie || <span className={styles.texte_discret}>Compagnie supprimée</span>}</td>
                                        <td className={`${styles.colonne_secondaire} ${styles.texte_discret}`}>{libelleFrequence(e)}</td>
                                        <td className={`${styles.colonne_secondaire} ${styles.nombre}`} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {e.limiteKg ? `${formatNombre(e.limiteKg)} kg` : '—'} · {e.tarifParKilo ? `${formatNombre(e.tarifParKilo)} €/kg` : '—'}
                                        </td>
                                        <td className={`${styles.colonne_secondaire} ${styles.nombre}`} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{e.poids || '—'}</td>
                                        <td>
                                            <Badge ton={tonExpedition(e.statut)}>{e.statut || '—'}</Badge>
                                            {e.compagnieSuspendue && <div className={styles.texte_discret} style={{ marginTop: 4, color: 'var(--rouge)' }}>Masquée (compagnie suspendue)</div>}
                                            {estDepartAffiche(e) && <div className={styles.texte_discret} style={{ marginTop: 4, color: 'var(--vert-fonce)' }}>Visible sur l'accueil</div>}
                                        </td>
                                        <td>
                                            <div className={styles.actions_ligne}>
                                                <button type="button" className={styles.bouton_icone} title="Supprimer cette expédition" aria-label="Supprimer cette expédition" onClick={() => setARetirer(e)}>
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {expeditions.length > 0 && (
                    <div className={styles.pied_tableau}>{visibles.length} expédition(s) affichée(s) sur {expeditions.length}</div>
                )}
            </Carte>

            {aRetirer && (
                <Confirmation
                    titre="Supprimer cette expédition ?"
                    message={`L'expédition ${aRetirer.reference || ''} ${aRetirer.villeDepart} → ${aRetirer.villeArrivee} de ${noms[aRetirer.idPartenaire] || aRetirer.nomCompagnie || 'cette compagnie'} sera supprimée définitivement et ne sera plus affichée sur le site.`}
                    libelle="Supprimer"
                    danger
                    onConfirmer={async () => {
                        try {
                            await supprimerExpedition(aRetirer.id);
                            notifier('Expédition supprimée.');
                        } catch (err) {
                            console.error('Erreur suppression expédition :', err);
                            notifier("Impossible de supprimer l'expédition.", 'erreur');
                            throw err;
                        }
                    }}
                    onClose={() => setARetirer(null)}
                />
            )}
        </>
    );
}

// ════════════════════════════════════════════════════════════════════════
//  Support
// ════════════════════════════════════════════════════════════════════════

const FILTRES_TICKETS = [
    { valeur: 'ouverts', label: 'En cours' },
    { valeur: 'resolus', label: 'Résolus' },
    { valeur: 'tous', label: 'Tous' },
];

function Support({ tickets, compagnies, notifier }) {
    const [filtre, setFiltre] = useState('ouverts');
    const [recherche, setRecherche] = useState('');
    const [enCours, setEnCours] = useState(null);
    const noms = useNomsCompagnies(compagnies);

    const visibles = useMemo(
        () => tickets
            .filter((t) => filtre === 'tous' || (filtre === 'resolus') === (t.statut === 'Résolu'))
            .filter((t) => correspond(recherche, t.sujet, t.message, noms[t.idPartenaire]))
            .sort(parDateDecroissante('date')),
        [tickets, filtre, recherche, noms]
    );

    const basculer = async (ticket) => {
        const resolu = ticket.statut === 'Résolu';
        setEnCours(ticket.id);
        try {
            await modifierTicket(ticket.id, { statut: resolu ? 'En cours' : 'Résolu' });
            notifier(resolu ? 'Demande rouverte.' : 'Demande marquée comme résolue.');
        } catch (err) {
            console.error('Erreur mise à jour ticket :', err);
            notifier('Impossible de mettre à jour la demande.', 'erreur');
        } finally {
            setEnCours(null);
        }
    };

    return (
        <Carte sansMarge>
            <div className={styles.barre_outils}>
                <BarreRecherche valeur={recherche} onChange={setRecherche} placeholder="Sujet, message, compagnie…" />
                <Filtres options={FILTRES_TICKETS} valeur={filtre} onChange={setFiltre} />
            </div>
            {visibles.length === 0 ? (
                <EtatVide
                    icone={<FaHeadset size={20} />}
                    titre={filtre === 'ouverts' && !recherche ? 'Tout est traité' : 'Aucune demande'}
                    texte={filtre === 'ouverts' && !recherche ? "Aucune demande de support n'attend de réponse." : undefined}
                />
            ) : (
                <ul className={styles.liste} style={{ padding: '0 20px' }}>
                    {visibles.map((t) => {
                        const resolu = t.statut === 'Résolu';
                        return (
                            <li key={t.id} className={styles.liste_element} style={{ alignItems: 'flex-start', padding: '16px 0' }}>
                                <Avatar texte={noms[t.idPartenaire] || '?'} image={compagnies.find((c) => c.id === t.idPartenaire)?.logoUrl} />
                                <div className={styles.liste_texte}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600 }}>{t.sujet || 'Sans sujet'}</span>
                                        <Badge ton={resolu ? 'vert' : 'orange'}>{resolu ? 'Résolu' : 'En cours'}</Badge>
                                    </div>
                                    <div className={styles.liste_secondaire}>
                                        {noms[t.idPartenaire] || 'Compagnie supprimée'} · {formatDate(t.date)}
                                    </div>
                                    <p style={{ margin: '8px 0 0', color: 'var(--texte-2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{t.message}</p>
                                </div>
                                <button
                                    type="button"
                                    className={`${styles.bouton} ${styles.bouton_petit}`}
                                    onClick={() => basculer(t)}
                                    disabled={enCours === t.id}
                                >
                                    {resolu ? <FaRedo size={10} /> : <FaCheck size={10} />} {resolu ? 'Rouvrir' : 'Marquer résolu'}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Carte>
    );
}

// ════════════════════════════════════════════════════════════════════════
//  Demandes de partenariat (formulaire "devenir partenaire" de l'accueil)
// ════════════════════════════════════════════════════════════════════════

function Demandes({ demandes, notifier, onCreerCompte }) {
    const [filtre, setFiltre] = useState('attente');
    const [recherche, setRecherche] = useState('');

    const nbArchives = demandes.filter((d) => d.traitee).length;
    const options = [
        { valeur: 'attente', label: `En attente (${demandes.length - nbArchives})` },
        { valeur: 'archives', label: `Archives (${nbArchives})` },
        { valeur: 'toutes', label: `Toutes (${demandes.length})` },
    ];

    const visibles = useMemo(
        () => demandes
            .filter((d) => filtre === 'toutes' || (filtre === 'archives') === Boolean(d.traitee))
            .filter((d) => correspond(recherche, d.prenom, d.nom, d.email, d.telephone))
            .sort(parDateDecroissante(filtre === 'archives' ? 'dateArchivage' : 'dateCreation')),
        [demandes, filtre, recherche]
    );

    const basculer = async (demande) => {
        try {
            if (demande.traitee) {
                await modifierDemandePartenaire(demande.id, { traitee: false, dateArchivage: null, compteCree: null });
                notifier('Demande remise en attente.');
            } else {
                await modifierDemandePartenaire(demande.id, { traitee: true, dateArchivage: Date.now() });
                notifier('Demande archivée. Retrouvez-la dans l\'onglet « Archives ».');
            }
        } catch (err) {
            console.error('Erreur mise à jour demande :', err);
            notifier('Impossible de mettre à jour la demande.', 'erreur');
        }
    };

    const titreVide = recherche
        ? 'Aucun résultat'
        : filtre === 'archives' ? 'Aucune demande archivée'
            : filtre === 'attente' ? 'Aucune demande en attente' : 'Aucune demande';

    return (
        <Carte sansMarge>
            <div className={styles.barre_outils}>
                <BarreRecherche valeur={recherche} onChange={setRecherche} placeholder="Nom, email, téléphone…" />
                <Filtres options={options} valeur={filtre} onChange={setFiltre} />
            </div>
            {visibles.length === 0 ? (
                <EtatVide
                    icone={<FaEnvelopeOpenText size={20} />}
                    titre={titreVide}
                    texte={recherche
                        ? 'Aucune demande ne correspond à cette recherche.'
                        : filtre === 'attente' ? 'Les demandes envoyées depuis le formulaire « devenir partenaire » de l\'accueil apparaîtront ici.' : undefined}
                />
            ) : (
                <ul className={styles.liste} style={{ padding: '0 20px' }}>
                    {visibles.map((d) => {
                        const nomComplet = [d.prenom, d.nom].filter(Boolean).join(' ') || 'Sans nom';
                        return (
                            <li key={d.id} className={styles.liste_element} style={{ alignItems: 'flex-start', padding: '16px 0', flexWrap: 'wrap' }}>
                                {d.logoUrl ? (
                                    <img src={d.logoUrl} alt="" className={styles.avatar} style={{ objectFit: 'cover' }} />
                                ) : (
                                    <Avatar texte={nomComplet} />
                                )}
                                <div className={styles.liste_texte}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600 }}>{nomComplet}</span>
                                        {!d.traitee && <Badge ton="orange">En attente</Badge>}
                                        {d.traitee && d.compteCree && <Badge ton="vert">Compte créé</Badge>}
                                        {d.traitee && !d.compteCree && <Badge ton="gris">Archivée</Badge>}
                                    </div>
                                    <div className={styles.liste_secondaire}>
                                        {d.email || '—'} · {d.telephone || '—'} · reçue le {formatDate(d.dateCreation)}
                                        {d.traitee && d.dateArchivage ? ` · archivée le ${formatDate(d.dateArchivage)}` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12.5 }}>
                                        {d.logoUrl && <a href={d.logoUrl} target="_blank" rel="noreferrer" className={styles.bouton_lien}>Voir le logo</a>}
                                        {d.preuveUrl && (
                                            <a href={d.preuveUrl} target="_blank" rel="noreferrer" className={styles.bouton_lien}>
                                                <FaFileAlt size={11} /> Preuve d'activité
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {!d.traitee && (
                                        <button
                                            type="button"
                                            className={`${styles.bouton} ${styles.bouton_petit} ${styles.bouton_principal}`}
                                            onClick={() => onCreerCompte(d)}
                                        >
                                            <FaUserPlus size={11} /> Créer le compte
                                        </button>
                                    )}
                                    <button type="button" className={`${styles.bouton} ${styles.bouton_petit}`} onClick={() => basculer(d)}>
                                        {d.traitee ? <><FaRedo size={10} /> Remettre en attente</> : 'Archiver'}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            {demandes.length > 0 && (
                <div className={styles.pied_tableau}>
                    {visibles.length} demande(s) affichée(s) · reçues via le formulaire « devenir partenaire » de la page d'accueil
                </div>
            )}
        </Carte>
    );
}

// ████████████████████████████████████████████████████████████████████████
//  ESPACE ADMIN : CONNEXION, NAVIGATION, DONNÉES
// ████████████████████████████████████████████████████████████████████████

// ════════════════════════════════════════════════════════════════════════
//  CONNEXION ET CONTRÔLE D'ACCÈS
// ════════════════════════════════════════════════════════════════════════

// ── Durée d'inactivité avant déconnexion automatique de l'admin ──
const DELAI_INACTIVITE_MS = 10 * 60 * 1000; // 10 minutes

function traduireErreurConnexion(code) {
    const messages = {
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
        'auth/network-request-failed': 'Problème de connexion internet.',
    };
    return messages[code] || 'Une erreur est survenue, réessayez.';
}

function EcranConnexion({ messageInfo }) {
    const [email, setEmail] = useState('');
    const [motDePasse, setMotDePasse] = useState('');
    const [visible, setVisible] = useState(false);
    const [erreur, setErreur] = useState('');
    const [enCours, setEnCours] = useState(false);

    const soumettre = async (e) => {
        e.preventDefault();
        setErreur('');
        setEnCours(true);
        try {
            await connexionAdmin(email.trim(), motDePasse);
        } catch (err) {
            setErreur(traduireErreurConnexion(err.code));
            setEnCours(false);
        }
    };

    return (
        <div className={styles.ecran_acces}>
            <div className={styles.ecran_acces_visuel}>
                <img src={logo} alt="GVIP" className={styles.logo_image} style={{ width: 120 }} />
                <div>
                    <h1>Gérez votre réseau de compagnies de transport.</h1>
                    <p>Enregistrez les compagnies partenaires, suivez leur activité et gardez la main sur tout le réseau GVIP.</p>
                </div>
                <p style={{ fontSize: 12 }}>© {new Date().getFullYear()} GVIP</p>
            </div>
            <div className={styles.ecran_acces_formulaire}>
                <form className={styles.boite_acces} onSubmit={soumettre}>
                    <h2>Espace administrateur</h2>
                    <p>Connectez-vous avec votre compte GVIP.</p>
                    {messageInfo && <div className={styles.message_erreur} style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>{messageInfo}</div>}
                    {erreur && <div className={styles.message_erreur}>{erreur}</div>}
                    <div className={styles.champ}>
                        <label htmlFor="admin-email">Email</label>
                        <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className={styles.champ}>
                        <label htmlFor="admin-mdp">Mot de passe</label>
                        <div className={styles.mot_de_passe}>
                            <input
                                id="admin-mdp"
                                type={visible ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={motDePasse}
                                onChange={(e) => setMotDePasse(e.target.value)}
                            />
                            <button
                                type="button"
                                className={styles.bouton_icone}
                                onClick={() => setVisible((v) => !v)}
                                aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            >
                                {visible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className={`${styles.bouton} ${styles.bouton_principal}`} disabled={enCours}>
                        {enCours ? 'Connexion…' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
}

/** Compte connecté mais absent de la branche "admins" : accès simplement refusé. */
function EcranAccesRefuse({ utilisateur }) {
    return (
        <div className={styles.boite_centree}>
            <div className={styles.carte}>
                <h2 className={styles.modale_titre}>Accès refusé</h2>
                <p style={{ margin: 0, color: 'var(--texte-2)', lineHeight: 1.6 }}>
                    Le compte <strong>{utilisateur.email}</strong> n'a pas accès à cet espace.
                </p>
                <div>
                    <button type="button" className={`${styles.bouton} ${styles.bouton_principal}`} onClick={deconnexionAdmin}>
                        Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════

const SECTIONS = {
    apercu: { titre: "Vue d'ensemble", sousTitre: "L'activité de tout le réseau GVIP en un coup d'œil", icone: <FaChartPie size={15} /> },
    compagnies: { titre: 'Compagnies', sousTitre: 'Les compagnies de transport partenaires de GVIP', icone: <FaBuilding size={15} /> },
    expeditions: { titre: 'Expéditions', sousTitre: "Les expéditions des compagnies ; celles « Planifié » à venir sont les départs affichés sur l'accueil", icone: <FaBoxOpen size={15} /> },
    support: { titre: 'Support', sousTitre: 'Les demandes envoyées par les compagnies depuis leur espace', icone: <FaHeadset size={15} /> },
    demandes: { titre: 'Demandes reçues', sousTitre: 'Les compagnies qui souhaitent rejoindre GVIP', icone: <FaEnvelopeOpenText size={15} /> },
};

function sectionDepuisUrl() {
    const cle = window.location.hash.replace('#', '');
    return SECTIONS[cle] ? cle : 'apercu';
}

function Admin() {
    // ── Authentification ──
    const [utilisateur, setUtilisateur] = useState(null);
    const [acces, setAcces] = useState('chargement'); // chargement | deconnecte | refuse | autorise
    const [messageInfo, setMessageInfo] = useState('');

    useEffect(() => {
        return ecouterEtatAuth(async (user) => {
            setUtilisateur(user);
            if (!user) {
                setAcces('deconnecte');
                return;
            }
            setAcces('chargement');
            try {
                setAcces((await estAdmin(user.uid)) ? 'autorise' : 'refuse');
            } catch (err) {
                console.error('Erreur vérification admin :', err);
                setAcces('refuse');
            }
        });
    }, []);

    // ── Déconnexion automatique après inactivité ──
    const minuteur = useRef(null);
    useEffect(() => {
        if (acces !== 'autorise') return;
        const relancer = () => {
            clearTimeout(minuteur.current);
            minuteur.current = setTimeout(async () => {
                setMessageInfo("Vous avez été déconnecté après 10 minutes d'inactivité.");
                await deconnexionAdmin();
            }, DELAI_INACTIVITE_MS);
        };
        const evenements = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
        evenements.forEach((ev) => window.addEventListener(ev, relancer, { passive: true }));
        relancer();
        return () => {
            clearTimeout(minuteur.current);
            evenements.forEach((ev) => window.removeEventListener(ev, relancer));
        };
    }, [acces]);

    // ── Données en temps réel (uniquement pour un admin autorisé) ──
    const [compagnies, setCompagnies] = useState([]);
    const [expeditions, setExpeditions] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [demandes, setDemandes] = useState([]);
    const [chargementCompagnies, setChargementCompagnies] = useState(true);

    useEffect(() => {
        if (acces !== 'autorise') return;
        const arrets = [
            ecouterCompagnies((liste) => {
                setCompagnies(liste);
                setChargementCompagnies(false);
            }, () => setChargementCompagnies(false)),
            ecouterToutesExpeditions(setExpeditions),
            ecouterTousTickets(setTickets),
            ecouterDemandesPartenaires(setDemandes),
        ];
        return () => arrets.forEach((arreter) => arreter());
    }, [acces]);

    // ── Navigation (la section active est gardée dans l'URL : #compagnies, …) ──
    const [section, setSection] = useState(sectionDepuisUrl);
    const [menuOuvert, setMenuOuvert] = useState(false);

    const allerA = useCallback((cle) => {
        setSection(cle);
        setMenuOuvert(false);
        window.history.replaceState(null, '', `#${cle}`);
        window.scrollTo({ top: 0 });
    }, []);

    // ── Notifications ──
    const [notifications, setNotifications] = useState([]);
    const notifier = useCallback((texte, type = 'succes') => {
        const id = Date.now() + Math.random();
        setNotifications((n) => [...n, { id, texte, type }]);
        setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), 4000);
    }, []);

    // ── Création d'une compagnie (depuis l'en-tête ou depuis une demande reçue) ──
    const [creation, setCreation] = useState(null); // null | { valeurs, demandeId }

    const ouvrirCreation = (valeurs = {}, demandeId = null) => setCreation({ valeurs, demandeId });

    const creerDepuisDemande = (demande) => ouvrirCreation({
        nom: [demande.prenom, demande.nom].filter(Boolean).join(' '),
        email: demande.email || '',
        telephone: demande.telephone || '',
        logoUrl: demande.logoUrl || '',
    }, demande.id);

    const apresCreation = async (donnees) => {
        notifier(`${donnees.nomEntreprise} a été ajoutée.`);
        if (creation?.demandeId) {
            try {
                await modifierDemandePartenaire(creation.demandeId, { traitee: true, compteCree: true, dateArchivage: Date.now() });
            } catch (err) {
                console.error('Erreur archivage demande :', err);
            }
        }
    };

    const compteurs = useMemo(() => ({
        support: tickets.filter((t) => t.statut !== 'Résolu').length,
        demandes: demandes.filter((d) => !d.traitee).length,
    }), [tickets, demandes]);

    // ── Écrans d'accès ──
    if (acces === 'chargement') {
        return <div className={styles.racine}><div className={styles.chargement}>Chargement…</div></div>;
    }
    if (acces === 'deconnecte') {
        return <div className={styles.racine}><EcranConnexion messageInfo={messageInfo} /></div>;
    }
    if (acces === 'refuse') {
        return <div className={styles.racine}><EcranAccesRefuse utilisateur={utilisateur} /></div>;
    }

    const infoSection = SECTIONS[section];

    return (
        <div className={styles.racine}>
            <div className={styles.disposition}>
                {menuOuvert && <div className={styles.voile_mobile} onClick={() => setMenuOuvert(false)} />}

                <aside className={`${styles.barre_laterale} ${menuOuvert ? styles.barre_ouverte : ''}`}>
                    <div className={styles.logo_zone}>
                        <img src={logo} alt="GVIP" className={styles.logo_image} />
                        <span className={styles.logo_etiquette}>Admin</span>
                    </div>
                    <nav className={styles.navigation}>
                        <div className={styles.nav_titre}>Réseau</div>
                        {['apercu', 'compagnies', 'expeditions'].map((cle) => (
                            <button
                                key={cle}
                                type="button"
                                className={`${styles.nav_element} ${section === cle ? styles.nav_actif : ''}`}
                                onClick={() => allerA(cle)}
                            >
                                {SECTIONS[cle].icone} {SECTIONS[cle].titre}
                                {cle === 'compagnies' && compagnies.length > 0 && <span className={styles.nav_compteur}>{compagnies.length}</span>}
                            </button>
                        ))}
                        <div className={styles.nav_titre}>À traiter</div>
                        {['support', 'demandes'].map((cle) => (
                            <button
                                key={cle}
                                type="button"
                                className={`${styles.nav_element} ${section === cle ? styles.nav_actif : ''}`}
                                onClick={() => allerA(cle)}
                            >
                                {SECTIONS[cle].icone} {SECTIONS[cle].titre}
                                {compteurs[cle] > 0 && <span className={styles.nav_compteur}>{compteurs[cle]}</span>}
                            </button>
                        ))}
                    </nav>
                    <div className={styles.profil_admin}>
                        <Avatar texte={utilisateur.email} />
                        <div className={styles.profil_admin_texte}>
                            <div className={styles.profil_admin_nom}>{utilisateur.email}</div>
                            <div className={styles.profil_admin_role}>Administrateur</div>
                        </div>
                        <button type="button" className={styles.bouton_deconnexion} onClick={deconnexionAdmin} title="Se déconnecter" aria-label="Se déconnecter">
                            <FaSignOutAlt size={14} />
                        </button>
                    </div>
                </aside>

                <main className={styles.contenu}>
                    <header className={styles.entete}>
                        <button type="button" className={styles.bouton_menu} onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu">
                            <FaBars />
                        </button>
                        <div>
                            <h1 className={styles.entete_titre}>{infoSection.titre}</h1>
                            <p className={styles.entete_sous_titre}>{infoSection.sousTitre}</p>
                        </div>
                        <div className={styles.entete_actions}>
                            <button type="button" className={`${styles.bouton} ${styles.bouton_principal}`} onClick={() => ouvrirCreation()}>
                                <FaPlus size={12} /> <span>Ajouter une compagnie</span>
                            </button>
                        </div>
                    </header>

                    <div className={styles.page}>
                        {section === 'apercu' && (
                            <VueEnsemble compagnies={compagnies} expeditions={expeditions} tickets={tickets} demandes={demandes} allerA={allerA} />
                        )}
                        {section === 'compagnies' && (
                            <Compagnies
                                compagnies={compagnies}
                                expeditions={expeditions}
                                tickets={tickets}
                                chargement={chargementCompagnies}
                                notifier={notifier}
                                onAjouter={ouvrirCreation}
                            />
                        )}
                        {section === 'expeditions' && <Expeditions expeditions={expeditions} compagnies={compagnies} notifier={notifier} />}
                        {section === 'support' && <Support tickets={tickets} compagnies={compagnies} notifier={notifier} />}
                        {section === 'demandes' && <Demandes demandes={demandes} notifier={notifier} onCreerCompte={creerDepuisDemande} />}
                    </div>
                </main>
            </div>

            {creation && (
                <ModaleCreationCompagnie
                    valeursInitiales={creation.valeurs}
                    onClose={() => setCreation(null)}
                    onCree={apresCreation}
                />
            )}

            <div className={styles.notifications} aria-live="polite">
                {notifications.map((n) => (
                    <div key={n.id} className={`${styles.notification} ${n.type === 'erreur' ? styles.notification_erreur : ''}`}>
                        {n.type === 'erreur' ? <FaTimes /> : <FaCheck />} {n.texte}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Admin;

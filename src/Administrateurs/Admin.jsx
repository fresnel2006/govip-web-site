import { useState, useEffect, useRef } from 'react';
import styles from './Admin.module.css';
import {
    ecouterCreneaux,
    ajouterCreneau as fbAjouterCreneau,
    modifierCreneau as fbModifierCreneau,
    supprimerCreneau as fbSupprimerCreneau,
    ecouterRendezVous,
    mettreAJourRendezVous,
    supprimerRendezVous as fbSupprimerRendezVous,
    ecouterEtatAuth,
    connexionAdmin,
    deconnexionAdmin,
    serverTimestamp,
} from '../firebase/firebase.js';
import {
    FaHome, FaCalendarAlt, FaClock, FaUsers,
    FaCheck, FaBoxOpen, FaPlus, FaArrowRight, FaTimes, FaPen, FaTrash, FaToggleOn, FaToggleOff, FaHashtag, FaSearch,
    FaSignOutAlt, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaBars
} from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';
import { CI, FR } from 'country-flag-icons/react/3x2';
import logo from '../assets/logo_entreprise.png'; // ← ajuste le chemin si besoin

// ── Durée d'inactivité avant déconnexion automatique de l'admin ──
const DELAI_INACTIVITE_MS = 10 * 60 * 1000; // 10 minutes

// ── Sections disponibles dans la barre latérale ──
const navItems = [
    { id: 'dashboard', icon: <FaHome size={16} />, label: 'Tableau de bord' },
    { id: 'rendezvous', icon: <FaCalendarAlt size={16} />, label: 'Rendez-vous' },
    { id: 'creneaux', icon: <FaCalendarAlt size={16} />, label: 'Créneaux disponibles' },
    { id: 'clients', icon: <FaUsers size={16} />, label: 'Clients' },
];

// ── Conversion d'heure Côte d'Ivoire ↔ France ──
const formatteurHeureAbidjan = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Abidjan',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});
const formatteurHeureParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

function heureDansAutrePays(dateISO, heure, paysSource) {
    if (!dateISO || !heure) return null;
    const [annee, mois, jour] = dateISO.split('-').map(Number);
    const [h, m] = heure.split(':').map(Number);
    if ([annee, mois, jour, h, m].some((n) => Number.isNaN(n))) return null;

    if (paysSource === 'CI') {
        const instantUTC = new Date(Date.UTC(annee, mois - 1, jour, h, m));
        return formatteurHeureParis.format(instantUTC);
    }

    let instantUTC = new Date(Date.UTC(annee, mois - 1, jour, h - 1, m));
    const rendu = formatteurHeureParis.format(instantUTC);
    const [hRendu] = rendu.split(':').map(Number);
    if (hRendu !== h) {
        instantUTC = new Date(Date.UTC(annee, mois - 1, jour, h - 2, m));
    }
    return formatteurHeureAbidjan.format(instantUTC);
}

// ── Libellé lisible pour la catégorie de service d'un rendez-vous ──
function libelleCategorie(categorie) {
    if (categorie === 'recuperation') return 'Récupération';
    if (categorie === 'depot') return 'Dépôt';
    return '—';
}

// ── Libellé de l'action qui fait passer le colis "En expédition" ──
function libelleConfirmationColis(categorie) {
    if (categorie === 'depot') return 'Marquer le colis comme en expédition';
    if (categorie === 'recuperation') return 'Marquer le colis comme en expédition';
    return 'Marquer comme en expédition';
}

function messageConfirmationColis(categorie) {
    if (categorie === 'depot') return 'Confirmer que le colis a bien été déposé et est maintenant en expédition ?';
    if (categorie === 'recuperation') return 'Confirmer que le colis a bien été récupéré et est maintenant en expédition ?';
    return 'Confirmer que ce colis est en expédition ?';
}

// ── Format court et lisible de l'identifiant Firebase d'un rendez-vous,
//    utilisé comme "numéro de commande" (même logique que côté client
//    dans Utilisateurs.jsx, pour que le numéro affiché à l'admin corresponde
//    exactement à celui vu par le client). ──
function formatIdentifiantCourt(id) {
    if (!id) return '';
    return id.slice(-8).toUpperCase();
}

// ── Numéro de commande à afficher côté admin : priorité au champ
//    numérique `numeroCommande` (9 chiffres), avec repli sur l'ancien
//    format pour les rendez-vous créés avant ce champ. ──
function numeroCommandeAffiche(rdv) {
    if (!rdv) return '';
    return rdv.numeroCommande || formatIdentifiantCourt(rdv.id);
}

// ── Cycle des statuts possibles pour un rendez-vous (clic sur le badge pour avancer) ──
const CYCLE_STATUTS_RDV = ['En attente', 'Confirmé', 'En expédition', 'Terminé'];

function prochainStatutRdv(statutActuel) {
    const index = CYCLE_STATUTS_RDV.indexOf(statutActuel);
    if (index === -1) return CYCLE_STATUTS_RDV[0];
    return CYCLE_STATUTS_RDV[(index + 1) % CYCLE_STATUTS_RDV.length];
}

function classeBadgeStatutRdv(statut) {
    if (statut === 'Confirmé') return styles.badge_vert;
    if (statut === 'En expédition') return styles.badge_bleu;
    if (statut === 'Terminé') return styles.badge_gris;
    if (statut === 'Annulé') return styles.badge_rouge;
    return styles.badge_orange; // En attente
}

function StatCard({ label, value, sub, icon, iconColor }) {
    return (
        <div className={styles.carte_stat}>
            <div className={styles.contenu_stat}>
                <p className={styles.libelle_stat}>{label}</p>
                <p className={styles.valeur_stat}>{value}</p>
                <p className={styles.sous_texte_stat}>{sub}</p>
            </div>
            <div className={styles.icone_stat} style={{ color: iconColor, borderColor: iconColor + '33', background: iconColor + '12' }}>
                {icon}
            </div>
        </div>
    );
}

// ── Barre de recherche réutilisable (style discret, cohérent avec les cartes) ──
function BarreRecherche({ valeur, onChange, placeholder }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '14px',
                background: '#f9fafb',
                maxWidth: '360px',
            }}
        >
            <FaSearch size={12} color="#9ca3af" />
            <input
                type="text"
                value={valeur}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '13px',
                    color: '#111827',
                }}
            />
        </div>
    );
}

// ── Page de connexion admin (email / mot de passe via Firebase Auth) ──
// Réutilise les mêmes classes que les modales pour garder le même style visuel.
function PageConnexionAdmin({ messageInfo }) {
    const [email, setEmail] = useState('');
    const [motDePasse, setMotDePasse] = useState('');
    const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
    const [chargement, setChargement] = useState(false);
    const [erreur, setErreur] = useState('');

    const messageErreur = (code) => {
        switch (code) {
            case 'auth/invalid-email':
                return "L'adresse email n'est pas valide.";
            case 'auth/user-disabled':
                return 'Ce compte a été désactivé.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Email ou mot de passe incorrect.';
            case 'auth/too-many-requests':
                return 'Trop de tentatives. Réessayez dans quelques minutes.';
            case 'auth/network-request-failed':
                return 'Problème de connexion internet. Vérifiez votre réseau.';
            default:
                return 'Une erreur est survenue. Veuillez réessayer.';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErreur('');

        const emailPropre = email.trim();

        if (!emailPropre || !motDePasse) {
            setErreur('Merci de remplir tous les champs.');
            return;
        }

        setChargement(true);
        try {
            await connexionAdmin(emailPropre, motDePasse);
        } catch (err) {
            console.error('Erreur de connexion admin :', err.code);
            setErreur(messageErreur(err.code));
        } finally {
            setChargement(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                padding: '20px',
            }}
        >
            <div className={styles.fenetre_modal} style={{ width: '100%', maxWidth: '400px', margin: 0 }}>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                    <img src={logo} alt="Logo GVIP" style={{ height: '52px', marginBottom: '14px' }} />
                    <h2 className={styles.titre_modal} style={{ marginBottom: '4px' }}>
                        Espace administrateur
                    </h2>
                    <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
                        Connectez-vous pour accéder au tableau de bord GVIP.
                    </p>
                </div>

                {messageInfo && (
                    <p
                        style={{
                            fontSize: '13px',
                            color: '#f97316',
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            marginBottom: '16px',
                            textAlign: 'center',
                        }}
                    >
                        {messageInfo}
                    </p>
                )}

                <form onSubmit={handleSubmit} className={styles.formulaire_modal}>
                    <label className={styles.libelle_modal}>
                        Email
                        <div style={{ position: 'relative' }}>
                            <FaEnvelope
                                size={13}
                                color="#9ca3af"
                                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <input
                                type="email"
                                className={styles.champ_modal}
                                style={{ paddingLeft: '32px' }}
                                placeholder="admin@govip.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"
                                disabled={chargement}
                            />
                        </div>
                    </label>

                    <label className={styles.libelle_modal}>
                        Mot de passe
                        <div style={{ position: 'relative' }}>
                            <FaLock
                                size={13}
                                color="#9ca3af"
                                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <input
                                type={afficherMotDePasse ? 'text' : 'password'}
                                className={styles.champ_modal}
                                style={{ paddingLeft: '32px', paddingRight: '36px' }}
                                placeholder="••••••••"
                                value={motDePasse}
                                onChange={(e) => setMotDePasse(e.target.value)}
                                autoComplete="current-password"
                                disabled={chargement}
                            />
                            <span
                                onClick={() => setAfficherMotDePasse((v) => !v)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                    color: '#9ca3af',
                                    display: 'flex',
                                }}
                            >
                                {afficherMotDePasse ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                            </span>
                        </div>
                    </label>

                    {erreur && <p className={styles.erreur_modal}>{erreur}</p>}

                    <button type="submit" className={styles.bouton_ajouter} disabled={chargement} style={{ justifyContent: 'center', width: '100%' }}>
                        {chargement ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Modal pour ajouter / modifier un créneau ──
function ModalCreneau({ onClose, onAjouter, onModifier, creneauAModifier }) {
    const estEdition = Boolean(creneauAModifier);

    const [form, setForm] = useState({
        date: creneauAModifier?.date || '',
        type: creneauAModifier?.type || 'Dépôt',
        heureDebut: creneauAModifier?.heureDebut || '',
        heureFin: creneauAModifier?.heureFin || '',
        max: creneauAModifier?.max ?? 10,
        statut: creneauAModifier?.statut || 'Actif',
        pays: creneauAModifier?.pays || 'CI',
    });
    const [loading, setLoading] = useState(false);
    const [erreur, setErreur] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErreur('');

        if (!form.date || !form.heureDebut || !form.heureFin) {
            setErreur('Merci de remplir tous les champs.');
            return;
        }

        setLoading(true);
        try {
            if (estEdition) {
                await onModifier(creneauAModifier.id, {
                    date: form.date,
                    type: form.type,
                    heureDebut: form.heureDebut,
                    heureFin: form.heureFin,
                    max: Number(form.max),
                    statut: form.statut,
                    pays: form.pays,
                });
            } else {
                await onAjouter({
                    date: form.date,
                    type: form.type,
                    heureDebut: form.heureDebut,
                    heureFin: form.heureFin,
                    max: Number(form.max),
                    statut: 'Actif',
                    pays: form.pays,
                });
            }
            onClose();
        } catch (err) {
            setErreur("Erreur lors de l'enregistrement. Réessaie.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.fond_modal} onClick={onClose}>
            <div className={styles.fenetre_modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.entete_modal}>
                    <h2 className={styles.titre_modal}>
                        {estEdition ? 'Modifier le créneau' : 'Ajouter un créneau'}
                    </h2>
                    <FaTimes className={styles.fermer_modal} onClick={onClose} />
                </div>

                <form onSubmit={handleSubmit} className={styles.formulaire_modal}>
                    <label className={styles.libelle_modal}>
                        Date
                        <input
                            type="date"
                            name="date"
                            className={styles.champ_modal}
                            value={form.date}
                            onChange={handleChange}
                        />
                    </label>

                    <label className={styles.libelle_modal}>
                        Type
                        <select
                            name="type"
                            className={styles.champ_modal}
                            value={form.type}
                            onChange={handleChange}
                        >
                            <option value="Dépôt">Dépôt</option>
                        </select>
                    </label>

                    <div className={styles.ligne_modal}>
                        <label className={styles.libelle_modal}>
                            Heure début
                            <input
                                type="time"
                                name="heureDebut"
                                className={styles.champ_modal}
                                value={form.heureDebut}
                                onChange={handleChange}
                            />
                        </label>
                        <label className={styles.libelle_modal}>
                            Heure fin
                            <input
                                type="time"
                                name="heureFin"
                                className={styles.champ_modal}
                                value={form.heureFin}
                                onChange={handleChange}
                            />
                        </label>
                    </div>

                    <label className={styles.libelle_modal}>
                        Cet horaire est saisi en heure de...
                        <select
                            name="pays"
                            className={styles.champ_modal}
                            value={form.pays}
                            onChange={handleChange}
                        >
                            <option value="CI">🇨🇮 Côte d'Ivoire (heure d'Abidjan)</option>
                            <option value="FR">🇫🇷 France (heure de Paris)</option>
                        </select>
                    </label>

                    {form.date && form.heureDebut && form.heureFin && (
                        <p className={styles.apercu_conversion}>
                            Équivaut à {heureDansAutrePays(form.date, form.heureDebut, form.pays)} - {heureDansAutrePays(form.date, form.heureFin, form.pays)}
                            {' '}en {form.pays === 'CI' ? 'France' : "Côte d'Ivoire"}
                        </p>
                    )}

                    <label className={styles.libelle_modal}>
                        Capacité max.
                        <input
                            type="number"
                            name="max"
                            min="1"
                            className={styles.champ_modal}
                            value={form.max}
                            onChange={handleChange}
                        />
                    </label>

                    {estEdition && (
                        <label className={styles.libelle_modal}>
                            Statut
                            <select
                                name="statut"
                                className={styles.champ_modal}
                                value={form.statut}
                                onChange={handleChange}
                            >
                                <option value="Actif">Actif</option>
                                <option value="Inactif">Inactif</option>
                            </select>
                        </label>
                    )}

                    {erreur && <p className={styles.erreur_modal}>{erreur}</p>}

                    <button type="submit" className={styles.bouton_ajouter} disabled={loading}>
                        {loading ? 'Enregistrement...' : estEdition ? 'Enregistrer' : 'Confirmer'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function Admin() {
    // ── État de l'authentification admin ──
    const [utilisateur, setUtilisateur] = useState(null);
    const [chargementAuth, setChargementAuth] = useState(true);
    // ── Message affiché sur la page de connexion après une déconnexion automatique ──
    const [messageDeconnexionAuto, setMessageDeconnexionAuto] = useState('');

    // ── État d'ouverture du menu latéral sur mobile (fermé par défaut) ──
    const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);

    useEffect(() => {
        const unsubscribe = ecouterEtatAuth((user) => {
            setUtilisateur(user);
            setChargementAuth(false);
        });
        return () => unsubscribe();
    }, []);

    const deconnexion = async () => {
        if (!window.confirm('Se déconnecter ?')) return;
        await deconnexionAdmin();
    };

    // ── Déconnexion automatique après DELAI_INACTIVITE_MS sans aucune activité
    //    (souris, clavier, clic, défilement, tactile). Le minuteur est relancé
    //    à chaque activité détectée, et complètement retiré si l'admin n'est
    //    pas connecté (pas besoin de surveiller une page de connexion). ──
    const minuteurInactiviteRef = useRef(null);

    useEffect(() => {
        if (!utilisateur) return;

        const reinitialiserMinuteur = () => {
            if (minuteurInactiviteRef.current) {
                clearTimeout(minuteurInactiviteRef.current);
            }
            minuteurInactiviteRef.current = setTimeout(() => {
                deconnexionAdmin();
                setMessageDeconnexionAuto('Vous avez été déconnecté après 10 minutes d\'inactivité.');
            }, DELAI_INACTIVITE_MS);
        };

        const evenementsActivite = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        evenementsActivite.forEach((evt) => window.addEventListener(evt, reinitialiserMinuteur));

        // Démarre le minuteur dès la connexion
        reinitialiserMinuteur();

        return () => {
            if (minuteurInactiviteRef.current) {
                clearTimeout(minuteurInactiviteRef.current);
            }
            evenementsActivite.forEach((evt) => window.removeEventListener(evt, reinitialiserMinuteur));
        };
    }, [utilisateur]);

    // ── Efface le message d'info dès qu'une nouvelle connexion réussit ──
    useEffect(() => {
        if (utilisateur) {
            setMessageDeconnexionAuto('');
        }
    }, [utilisateur]);

    const [creneaux, setCreneaux] = useState([]);
    const [loadingCreneaux, setLoadingCreneaux] = useState(true);

    const [rendezVous, setRendezVous] = useState([]);
    const [loadingRendezVous, setLoadingRendezVous] = useState(true);

    const [modalOuvert, setModalOuvert] = useState(false);
    const [creneauEnEdition, setCreneauEnEdition] = useState(null);

    const [sectionActive, setSectionActive] = useState('dashboard');

    // ── Texte saisi dans les barres de recherche ──
    const [rechercheRdv, setRechercheRdv] = useState('');
    const [rechercheClient, setRechercheClient] = useState('');

    // ── Lecture en temps réel de la branche "creneaux" (seulement une fois connecté) ──
    useEffect(() => {
        if (!utilisateur) return;

        const unsubscribe = ecouterCreneaux((liste) => {
            const listeTriee = [...liste].sort((a, b) => (a.date > b.date ? 1 : -1));
            setCreneaux(listeTriee);
            setLoadingCreneaux(false);
        }, () => {
            setLoadingCreneaux(false);
        });

        return () => unsubscribe();
    }, [utilisateur]);

    // ── Lecture en temps réel de la branche "rendezVous" (seulement une fois connecté) ──
    useEffect(() => {
        if (!utilisateur) return;

        const unsubscribe = ecouterRendezVous((liste) => {
            const listeTriee = [...liste].sort((a, b) => {
                if (a.date !== b.date) return a.date > b.date ? -1 : 1;
                return (b.dateCreation || 0) - (a.dateCreation || 0);
            });

            setRendezVous(listeTriee);
            setLoadingRendezVous(false);
        }, () => {
            setLoadingRendezVous(false);
        });

        return () => unsubscribe();
    }, [utilisateur]);

    // ── Ajout d'un créneau dans Firebase ──
    const ajouterCreneau = async (nouveauCreneau) => {
        await fbAjouterCreneau(nouveauCreneau);
    };

    // ── Modification complète d'un créneau (formulaire) ──
    const modifierCreneau = async (id, donnees) => {
        await fbModifierCreneau(id, donnees);
    };

    // ── Bascule rapide Actif / Inactif ──
    const toggleStatutCreneau = async (creneau) => {
        const nouveauStatut = creneau.statut === 'Actif' ? 'Inactif' : 'Actif';
        await fbModifierCreneau(creneau.id, { statut: nouveauStatut });
    };

    // ── Suppression d'un créneau ──
    const supprimerCreneau = async (id) => {
        if (!window.confirm('Supprimer ce créneau ?')) return;
        await fbSupprimerCreneau(id);
    };

    // ── Fait avancer le statut d'un rendez-vous (En attente → Confirmé → En expédition → Terminé → ...) ──
    const avancerStatutRendezVous = async (rdv) => {
        const nouveauStatut = prochainStatutRdv(rdv.statut);
        await mettreAJourRendezVous(rdv.id, { statut: nouveauStatut });
    };

    // ── Confirme que le colis a été déposé / récupéré → passe le rendez-vous "En expédition" ──
    const confirmerColisTraite = async (rdv) => {
        if (!window.confirm(messageConfirmationColis(rdv.categorieService))) return;
        await mettreAJourRendezVous(rdv.id, {
            statut: 'En expédition',
            colisConfirmeLe: serverTimestamp(),
        });
    };

    // ── Annule un rendez-vous ──
    const annulerRendezVous = async (id) => {
        if (!window.confirm('Annuler ce rendez-vous ?')) return;
        await mettreAJourRendezVous(id, { statut: 'Annulé' });
    };

    // ── Supprime définitivement un rendez-vous ──
    const supprimerRendezVous = async (id) => {
        if (!window.confirm('Supprimer définitivement ce rendez-vous ?')) return;
        await fbSupprimerRendezVous(id);
    };

    const ouvrirModalAjout = () => {
        setCreneauEnEdition(null);
        setModalOuvert(true);
    };

    const ouvrirModalEdition = (creneau) => {
        setCreneauEnEdition(creneau);
        setModalOuvert(true);
    };

    const fermerModal = () => {
        setModalOuvert(false);
        setCreneauEnEdition(null);
    };

    // ── Change de section et referme automatiquement le menu mobile ──
    const allerVersSection = (id) => {
        setSectionActive(id);
        setMenuMobileOuvert(false);
    };

    // ── Calcul des stats à partir des vraies données de Firebase ──
    const totalRendezVous = rendezVous.length;
    const enAttente = rendezVous.filter((r) => r.statut === 'En attente').length;
    const confirmes = rendezVous.filter((r) => r.statut === 'Confirmé').length;
    const enExpedition = rendezVous.filter((r) => r.statut === 'En expédition').length;
    const termines = rendezVous.filter((r) => r.statut === 'Terminé').length;

    // ── Liste unique des clients déduite des rendez-vous ──
    const clients = Object.values(
        rendezVous.reduce((acc, r) => {
            const cle = (r.nomComplet || 'Client inconnu') + '|' + (r.telephone || r.email || '');
            if (!acc[cle]) {
                acc[cle] = {
                    nom: r.nomComplet || 'Client inconnu',
                    telephone: r.telephone || '—',
                    email: r.email || '—',
                    nbRendezVous: 0,
                };
            }
            acc[cle].nbRendezVous += 1;
            return acc;
        }, {})
    );

    // ── Filtrage des rendez-vous selon la barre de recherche ──
    const termeRdv = rechercheRdv.trim().toLowerCase();
    const rendezVousFiltres = termeRdv === ''
        ? rendezVous
        : rendezVous.filter((r) => {
            const champs = [
                numeroCommandeAffiche(r),
                r.nomComplet,
                r.telephone,
                r.destination,
                libelleCategorie(r.categorieService),
                r.statut,
                r.date,
            ];
            return champs.some((champ) => (champ || '').toString().toLowerCase().includes(termeRdv));
        });

    // ── Filtrage des clients selon la barre de recherche ──
    const termeClient = rechercheClient.trim().toLowerCase();
    const clientsFiltres = termeClient === ''
        ? clients
        : clients.filter((c) => {
            const champs = [c.nom, c.telephone, c.email];
            return champs.some((champ) => (champ || '').toString().toLowerCase().includes(termeClient));
        });

    const titresSection = {
        dashboard: 'Tableau de bord',
        rendezvous: 'Rendez-vous',
        creneaux: 'Créneaux disponibles',
        clients: 'Clients',
    };

    // ── Tant qu'on ne sait pas encore si l'admin est connecté, écran d'attente ──
    if (chargementAuth) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Chargement...</p>
            </div>
        );
    }

    // ── Pas connecté → formulaire de connexion (avec message si déconnexion auto) ──
    if (!utilisateur) {
        return <PageConnexionAdmin messageInfo={messageDeconnexionAuto} />;
    }

    return (
        <>
            <div className={styles.disposition}>

                {/* ── Barre d'en-tête mobile (visible uniquement en dessous de 900px) ── */}
                <div className={styles.entete_mobile}>
                    <button
                        className={styles.bouton_hamburger}
                        onClick={() => setMenuMobileOuvert(true)}
                        aria-label="Ouvrir le menu"
                    >
                        <FaBars />
                    </button>
                    <img src={logo} alt="Logo GVIP" className={styles.entete_mobile_logo} />
                    <span style={{ width: 32 }} />
                </div>

                {/* ── Voile sombre derrière le menu mobile ouvert ── */}
                {menuMobileOuvert && (
                    <div
                        className={styles.voile_mobile}
                        onClick={() => setMenuMobileOuvert(false)}
                    />
                )}

                {/* ── Barre latérale (menu coulissant sur mobile) ── */}
                <aside
                    className={`${styles.barre_laterale} ${menuMobileOuvert ? styles.barre_laterale_ouverte : ''}`}
                >
                    <div className={styles.barre_laterale_logo}>
                        <img src={logo} alt="Logo GVIP" className={styles.image_logo} />
                        <span
                            className={styles.bouton_hamburger}
                            style={{ marginLeft: 'auto', color: '#fff', display: 'none' }}
                        />
                    </div>

                    <nav className={styles.navigation}>
                        {navItems.map((item) => (
                            <div
                                key={item.id}
                                className={`${styles.element_nav} ${sectionActive === item.id ? styles.element_nav_actif : ''}`}
                                onClick={() => allerVersSection(item.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </div>
                        ))}

                        {/* ── Déconnexion manuelle ── */}
                        <div
                            className={styles.element_nav}
                            onClick={deconnexion}
                            style={{ cursor: 'pointer', marginTop: 'auto', color: '#dc2626' }}
                        >
                            <FaSignOutAlt size={16} />
                            <span>Déconnexion</span>
                        </div>
                    </nav>
                </aside>

                {/* ── Contenu principal ── */}
                <main className={styles.contenu_principal}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <h1 className={styles.titre_page}>{titresSection[sectionActive]}</h1>
                        <p style={{ fontSize: '13px', color: '#6b7280' }}>{utilisateur.email}</p>
                    </div>

                    {/* ── Section : Tableau de bord ── */}
                    {sectionActive === 'dashboard' && (
                        <>
                            <div className={styles.grille_stats}>
                                <StatCard
                                    label="Total rendez-vous"
                                    value={totalRendezVous}
                                    sub="Toutes périodes"
                                    icon={<FaCalendarAlt size={22} />}
                                    iconColor="#16a34a"
                                />
                                <StatCard
                                    label="En attente"
                                    value={enAttente}
                                    sub="À confirmer"
                                    icon={<FaClock size={22} />}
                                    iconColor="#f97316"
                                />
                                <StatCard
                                    label="Confirmés"
                                    value={confirmes}
                                    sub="Toutes périodes"
                                    icon={<FaCheck size={22} />}
                                    iconColor="#16a34a"
                                />
                                <StatCard
                                    label="En expédition"
                                    value={enExpedition}
                                    sub="Colis en route"
                                    icon={<FaArrowRight size={22} />}
                                    iconColor="#2563eb"
                                />
                                <StatCard
                                    label="Terminés"
                                    value={termines}
                                    sub="Toutes périodes"
                                    icon={<FiPackage size={22} />}
                                    iconColor="#6b7280"
                                />
                            </div>

                            <div className={styles.ligne_tableaux}>

                                {/* Prochains rendez-vous */}
                                <div className={styles.carte_tableau}>
                                    <h2 className={styles.titre_tableau}>Prochains rendez-vous</h2>

                                    {loadingRendezVous ? (
                                        <p className={styles.sous_texte_stat}>Chargement des rendez-vous...</p>
                                    ) : rendezVous.length === 0 ? (
                                        <p className={styles.sous_texte_stat}>Aucun rendez-vous pour le moment.</p>
                                    ) : (
                                        <div className={styles.conteneur_tableau_scroll}>
                                            <table className={styles.tableau}>
                                                <thead>
                                                    <tr>
                                                        <th>N°</th>
                                                        <th>Nom</th>
                                                        <th>Catégorie</th>
                                                        <th>Date</th>
                                                        <th>Heure</th>
                                                        <th>Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rendezVous.slice(0, 5).map((r) => {
                                                        const paysCreneauRdv = r.creneauPays || 'CI';
                                                        return (
                                                            <tr key={r.id}>
                                                                <td>
                                                                    <span
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}
                                                                        title={r.id}
                                                                    >
                                                                        <FaHashtag size={9} />
                                                                        {numeroCommandeAffiche(r)}
                                                                    </span>
                                                                </td>
                                                                <td>{r.nomComplet}</td>
                                                                <td>{libelleCategorie(r.categorieService)}</td>
                                                                <td>{r.date}</td>
                                                                <td>
                                                                    <div className={styles.heure_avec_drapeau}>
                                                                        {paysCreneauRdv === 'FR' ? (
                                                                            <FR title="France" className={styles.drapeau_mini} />
                                                                        ) : (
                                                                            <CI title="Côte d'Ivoire" className={styles.drapeau_mini} />
                                                                        )}
                                                                        {r.heureDebut} - {r.heureFin}
                                                                    </div>
                                                                    <div className={styles.heure_fuseau_secondaire}>
                                                                        {paysCreneauRdv === 'FR' ? (
                                                                            <CI title="Côte d'Ivoire" className={styles.drapeau_mini} />
                                                                        ) : (
                                                                            <FR title="France" className={styles.drapeau_mini} />
                                                                        )}
                                                                        {heureDansAutrePays(r.date, r.heureDebut, paysCreneauRdv)} - {heureDansAutrePays(r.date, r.heureFin, paysCreneauRdv)}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`${styles.badge} ${classeBadgeStatutRdv(r.statut)}`}>
                                                                        {r.statut}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <p className={styles.voir_tous} onClick={() => allerVersSection('rendezvous')}>
                                        Voir tous les rendez-vous
                                    </p>
                                </div>

                                {/* Créneaux disponibles */}
                                <div className={styles.carte_tableau}>
                                    <div className={styles.entete_carte_tableau}>
                                        <h2 className={styles.titre_tableau}>Gérer les créneaux disponibles</h2>
                                        <button className={styles.bouton_ajouter} onClick={ouvrirModalAjout}>
                                            <FaPlus size={11} />
                                            Ajouter un créneau
                                        </button>
                                    </div>

                                    {loadingCreneaux ? (
                                        <p className={styles.sous_texte_stat}>Chargement des créneaux...</p>
                                    ) : creneaux.length === 0 ? (
                                        <p className={styles.sous_texte_stat}>Aucun créneau pour le moment.</p>
                                    ) : (
                                        <div className={styles.conteneur_tableau_scroll}>
                                            <table className={styles.tableau}>
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th>Heure</th>
                                                        <th>Max.</th>
                                                        <th>Statut</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {creneaux.slice(0, 5).map((c) => (
                                                        <tr key={c.id}>
                                                            <td>{c.date}</td>
                                                            <td>{c.type}</td>
                                                            <td>
                                                                <div className={styles.heure_avec_drapeau}>
                                                                    {(c.pays || 'CI') === 'FR' ? (
                                                                        <FR title="Heure de Paris" className={styles.drapeau_mini} />
                                                                    ) : (
                                                                        <CI title="Heure d'Abidjan" className={styles.drapeau_mini} />
                                                                    )}
                                                                    {c.heureDebut} - {c.heureFin}
                                                                </div>
                                                            </td>
                                                            <td>Max. {c.max}</td>
                                                            <td>
                                                                <span
                                                                    className={`${styles.badge} ${c.statut === 'Actif' ? styles.badge_vert : styles.badge_orange}`}
                                                                    style={{ cursor: 'pointer' }}
                                                                    title="Cliquer pour changer le statut"
                                                                    onClick={() => toggleStatutCreneau(c)}
                                                                >
                                                                    {c.statut}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <span
                                                                        title={c.statut === 'Actif' ? 'Désactiver' : 'Activer'}
                                                                        style={{ cursor: 'pointer', color: c.statut === 'Actif' ? '#16a34a' : '#9ca3af', fontSize: '18px', display: 'flex' }}
                                                                        onClick={() => toggleStatutCreneau(c)}
                                                                    >
                                                                        {c.statut === 'Actif' ? <FaToggleOn /> : <FaToggleOff />}
                                                                    </span>
                                                                    <span
                                                                        title="Modifier"
                                                                        style={{ cursor: 'pointer', color: '#6b7280', fontSize: '13px', display: 'flex' }}
                                                                        onClick={() => ouvrirModalEdition(c)}
                                                                    >
                                                                        <FaPen />
                                                                    </span>
                                                                    <span
                                                                        title="Supprimer"
                                                                        style={{ cursor: 'pointer', color: '#dc2626', fontSize: '13px', display: 'flex' }}
                                                                        onClick={() => supprimerCreneau(c.id)}
                                                                    >
                                                                        <FaTrash />
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <p className={styles.voir_tous} onClick={() => allerVersSection('creneaux')}>
                                        Voir tous les créneaux
                                    </p>
                                </div>

                            </div>
                        </>
                    )}

                    {/* ── Section : Rendez-vous (vue complète) ── */}
                    {sectionActive === 'rendezvous' && (
                        <div className={styles.carte_tableau}>
                            <h2 className={styles.titre_tableau}>Tous les rendez-vous</h2>

                            <BarreRecherche
                                valeur={rechercheRdv}
                                onChange={(e) => setRechercheRdv(e.target.value)}
                                placeholder="Rechercher par n°, nom, téléphone, destination, statut..."
                            />

                            {loadingRendezVous ? (
                                <p className={styles.sous_texte_stat}>Chargement des rendez-vous...</p>
                            ) : rendezVousFiltres.length === 0 ? (
                                <p className={styles.sous_texte_stat}>
                                    {termeRdv === '' ? 'Aucun rendez-vous pour le moment.' : 'Aucun rendez-vous ne correspond à cette recherche.'}
                                </p>
                            ) : (
                                <div className={styles.conteneur_tableau_scroll}>
                                    <table className={styles.tableau}>
                                        <thead>
                                            <tr>
                                                <th>N°</th>
                                                <th>Nom</th>
                                                <th>Téléphone</th>
                                                <th>Catégorie</th>
                                                <th>Destination</th>
                                                <th>Date</th>
                                                <th>Heure</th>
                                                <th>Statut</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rendezVousFiltres.map((r) => {
                                                const peutConfirmerColis = r.statut === 'Confirmé';
                                                const paysCreneauRdv = r.creneauPays || 'CI';
                                                return (
                                                    <tr key={r.id}>
                                                        <td>
                                                            <span
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}
                                                                title={r.id}
                                                            >
                                                                <FaHashtag size={9} />
                                                                {numeroCommandeAffiche(r)}
                                                            </span>
                                                        </td>
                                                        <td>{r.nomComplet}</td>
                                                        <td>{r.telephone}</td>
                                                        <td>{libelleCategorie(r.categorieService)}</td>
                                                        <td>
                                                            <div className={styles.destination_avec_drapeau}>
                                                                {r.destination === 'France' ? (
                                                                    <FR title="France" className={styles.drapeau_mini} />
                                                                ) : (
                                                                    <CI title="Côte d'Ivoire" className={styles.drapeau_mini} />
                                                                )}
                                                                {r.destination}
                                                            </div>
                                                        </td>
                                                        <td>{r.date}</td>
                                                        <td>
                                                            <div className={styles.heure_avec_drapeau}>
                                                                {paysCreneauRdv === 'FR' ? (
                                                                    <FR title="France" className={styles.drapeau_mini} />
                                                                ) : (
                                                                    <CI title="Côte d'Ivoire" className={styles.drapeau_mini} />
                                                                )}
                                                                {r.heureDebut} - {r.heureFin}
                                                            </div>
                                                            <div className={styles.heure_fuseau_secondaire}>
                                                                {paysCreneauRdv === 'FR' ? (
                                                                    <CI title="Côte d'Ivoire" className={styles.drapeau_mini} />
                                                                ) : (
                                                                    <FR title="France" className={styles.drapeau_mini} />
                                                                )}
                                                                {heureDansAutrePays(r.date, r.heureDebut, paysCreneauRdv)} - {heureDansAutrePays(r.date, r.heureFin, paysCreneauRdv)}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`${styles.badge} ${classeBadgeStatutRdv(r.statut)}`}
                                                                style={{ cursor: 'pointer' }}
                                                                title="Cliquer pour faire avancer le statut"
                                                                onClick={() => avancerStatutRendezVous(r)}
                                                            >
                                                                {r.statut}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                {peutConfirmerColis && (
                                                                    <span
                                                                        title={libelleConfirmationColis(r.categorieService)}
                                                                        style={{ cursor: 'pointer', color: '#2563eb', fontSize: '14px', display: 'flex' }}
                                                                        onClick={() => confirmerColisTraite(r)}
                                                                    >
                                                                        <FaBoxOpen />
                                                                    </span>
                                                                )}
                                                                <span
                                                                    title="Annuler"
                                                                    style={{ cursor: 'pointer', color: '#f97316', fontSize: '13px', display: 'flex' }}
                                                                    onClick={() => annulerRendezVous(r.id)}
                                                                >
                                                                    <FaTimes />
                                                                </span>
                                                                <span
                                                                    title="Supprimer"
                                                                    style={{ cursor: 'pointer', color: '#dc2626', fontSize: '13px', display: 'flex' }}
                                                                    onClick={() => supprimerRendezVous(r.id)}
                                                                >
                                                                    <FaTrash />
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Section : Créneaux disponibles (vue complète) ── */}
                    {sectionActive === 'creneaux' && (
                        <div className={styles.carte_tableau}>
                            <div className={styles.entete_carte_tableau}>
                                <h2 className={styles.titre_tableau}>Tous les créneaux</h2>
                                <button className={styles.bouton_ajouter} onClick={ouvrirModalAjout}>
                                    <FaPlus size={11} />
                                    Ajouter un créneau
                                </button>
                            </div>

                            {loadingCreneaux ? (
                                <p className={styles.sous_texte_stat}>Chargement des créneaux...</p>
                            ) : creneaux.length === 0 ? (
                                <p className={styles.sous_texte_stat}>Aucun créneau pour le moment.</p>
                            ) : (
                                <div className={styles.conteneur_tableau_scroll}>
                                    <table className={styles.tableau}>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Heure</th>
                                                <th>Max.</th>
                                                <th>Statut</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {creneaux.map((c) => (
                                                <tr key={c.id}>
                                                    <td>{c.date}</td>
                                                    <td>{c.type}</td>
                                                    <td>
                                                        <div className={styles.heure_avec_drapeau}>
                                                            {(c.pays || 'CI') === 'FR' ? (
                                                                <FR title="Heure de Paris" className={styles.drapeau_mini} />
                                                            ) : (
                                                                <CI title="Heure d'Abidjan" className={styles.drapeau_mini} />
                                                            )}
                                                            {c.heureDebut} - {c.heureFin}
                                                        </div>
                                                    </td>
                                                    <td>Max. {c.max}</td>
                                                    <td>
                                                        <span
                                                            className={`${styles.badge} ${c.statut === 'Actif' ? styles.badge_vert : styles.badge_orange}`}
                                                            style={{ cursor: 'pointer' }}
                                                            title="Cliquer pour changer le statut"
                                                            onClick={() => toggleStatutCreneau(c)}
                                                        >
                                                            {c.statut}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span
                                                                title={c.statut === 'Actif' ? 'Désactiver' : 'Activer'}
                                                                style={{ cursor: 'pointer', color: c.statut === 'Actif' ? '#16a34a' : '#9ca3af', fontSize: '18px', display: 'flex' }}
                                                                onClick={() => toggleStatutCreneau(c)}
                                                            >
                                                                {c.statut === 'Actif' ? <FaToggleOn /> : <FaToggleOff />}
                                                            </span>
                                                            <span
                                                                title="Modifier"
                                                                style={{ cursor: 'pointer', color: '#6b7280', fontSize: '13px', display: 'flex' }}
                                                                onClick={() => ouvrirModalEdition(c)}
                                                            >
                                                                <FaPen />
                                                            </span>
                                                            <span
                                                                title="Supprimer"
                                                                style={{ cursor: 'pointer', color: '#dc2626', fontSize: '13px', display: 'flex' }}
                                                                onClick={() => supprimerCreneau(c.id)}
                                                            >
                                                                <FaTrash />
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Section : Clients ── */}
                    {sectionActive === 'clients' && (
                        <div className={styles.carte_tableau}>
                            <h2 className={styles.titre_tableau}>Liste des clients</h2>

                            <BarreRecherche
                                valeur={rechercheClient}
                                onChange={(e) => setRechercheClient(e.target.value)}
                                placeholder="Rechercher par nom, téléphone ou email..."
                            />

                            {loadingRendezVous ? (
                                <p className={styles.sous_texte_stat}>Chargement des clients...</p>
                            ) : clientsFiltres.length === 0 ? (
                                <p className={styles.sous_texte_stat}>
                                    {termeClient === '' ? 'Aucun client pour le moment.' : 'Aucun client ne correspond à cette recherche.'}
                                </p>
                            ) : (
                                <div className={styles.conteneur_tableau_scroll}>
                                    <table className={styles.tableau}>
                                        <thead>
                                            <tr>
                                                <th>Nom</th>
                                                <th>Téléphone</th>
                                                <th>Email</th>
                                                <th>Rendez-vous</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clientsFiltres.map((c, i) => (
                                                <tr key={i}>
                                                    <td>{c.nom}</td>
                                                    <td>{c.telephone}</td>
                                                    <td>{c.email}</td>
                                                    <td>{c.nbRendezVous}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {modalOuvert && (
                <ModalCreneau
                    onClose={fermerModal}
                    onAjouter={ajouterCreneau}
                    onModifier={modifierCreneau}
                    creneauAModifier={creneauEnEdition}
                />
            )}
        </>
    );
}
export default Admin;
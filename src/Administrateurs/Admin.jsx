import { useState, useEffect } from 'react';
import styles from './Admin.module.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, serverTimestamp, update, remove } from 'firebase/database';
import {
    FaHome, FaCalendarAlt, FaClock, FaUsers,
    FaCheck, FaBoxOpen, FaPlus, FaArrowRight, FaTimes, FaPen, FaTrash, FaToggleOn, FaToggleOff
} from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';
import { CI, FR } from 'country-flag-icons/react/3x2';
import logo from '../assets/logo_entreprise.png'; // ← ajuste le chemin si besoin

// ── Connexion à Firebase ──
const firebaseConfig = {
    apiKey: "AIzaSyAzEog53jnWZksBq5SXo41mVvGMjhuqwV8",
    authDomain: "govip-parcels-appointments.firebaseapp.com",
    databaseURL: "https://govip-parcels-appointments-default-rtdb.firebaseio.com",
    projectId: "govip-parcels-appointments",
    storageBucket: "govip-parcels-appointments.firebasestorage.app",
    messagingSenderId: "5781132822",
    appId: "1:5781132822:web:906072edda7ad4b72d0737",
    measurementId: "G-WDLCTNFMW1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Sections disponibles dans la barre latérale ──
const navItems = [
    { id: 'dashboard', icon: <FaHome size={16} />, label: 'Tableau de bord' },
    { id: 'rendezvous', icon: <FaCalendarAlt size={16} />, label: 'Rendez-vous' },
    { id: 'creneaux', icon: <FaCalendarAlt size={16} />, label: 'Créneaux disponibles' },
    { id: 'clients', icon: <FaUsers size={16} />, label: 'Clients' },
];

// ── Conversion d'heure Côte d'Ivoire ↔ France ──
// La Côte d'Ivoire (Abidjan) est en UTC+0 toute l'année (pas d'heure d'été).
// La France est en UTC+1 (CET, hiver) ou UTC+2 (CEST, heure d'été).
// Cette fonction convertit une heure "HH:MM" saisie dans le fuseau `paysSource`
// ('CI' ou 'FR') vers l'heure équivalente dans l'autre pays, en tenant compte
// automatiquement du passage à l'heure d'été / hiver française.
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
        // Abidjan = UTC+0, donc l'heure saisie EST directement l'instant UTC.
        const instantUTC = new Date(Date.UTC(annee, mois - 1, jour, h, m));
        return formatteurHeureParis.format(instantUTC);
    }

    // France : on teste d'abord UTC+1 (hiver), puis on vérifie via le
    // formatteur si on est en heure d'été (UTC+2) et on corrige si besoin.
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

// ── Modal pour ajouter / modifier un créneau ──
function ModalCreneau({ onClose, onAjouter, onModifier, creneauAModifier }) {
    const estEdition = Boolean(creneauAModifier);

    const [form, setForm] = useState({
        date: creneauAModifier?.date || '',
        type: creneauAModifier?.type || 'Enlèvement',
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
                            <option value="Enlèvement">Enlèvement</option>
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
    const [creneaux, setCreneaux] = useState([]);
    const [loadingCreneaux, setLoadingCreneaux] = useState(true);

    const [rendezVous, setRendezVous] = useState([]);
    const [loadingRendezVous, setLoadingRendezVous] = useState(true);

    const [modalOuvert, setModalOuvert] = useState(false);
    const [creneauEnEdition, setCreneauEnEdition] = useState(null);

    const [sectionActive, setSectionActive] = useState('dashboard');

    // ── Lecture en temps réel de la branche "creneaux" dans Firebase ──
    useEffect(() => {
        const creneauxRef = ref(db, 'creneaux');

        const unsubscribe = onValue(creneauxRef, (snapshot) => {
            const data = snapshot.val() || {};
            const liste = Object.entries(data).map(([id, val]) => ({
                id,
                ...val,
            }));

            liste.sort((a, b) => (a.date > b.date ? 1 : -1));

            setCreneaux(liste);
            setLoadingCreneaux(false);
        }, (error) => {
            console.error("Erreur lecture créneaux :", error);
            setLoadingCreneaux(false);
        });

        return () => unsubscribe();
    }, []);

    // ── Lecture en temps réel de la branche "rendezVous" dans Firebase ──
    // (c'est la branche utilisée par le formulaire client : Utilisateurs.jsx)
    useEffect(() => {
        const rendezVousRef = ref(db, 'rendezVous');

        const unsubscribe = onValue(rendezVousRef, (snapshot) => {
            const data = snapshot.val() || {};
            const liste = Object.entries(data).map(([id, val]) => ({
                id,
                ...val,
            }));

            // Les plus récents en premier (basé sur la date du rendez-vous, puis date de création)
            liste.sort((a, b) => {
                if (a.date !== b.date) return a.date > b.date ? -1 : 1;
                return (b.dateCreation || 0) - (a.dateCreation || 0);
            });

            setRendezVous(liste);
            setLoadingRendezVous(false);
        }, (error) => {
            console.error("Erreur lecture rendez-vous :", error);
            setLoadingRendezVous(false);
        });

        return () => unsubscribe();
    }, []);

    // ── Ajout d'un créneau dans Firebase ──
    const ajouterCreneau = async (nouveauCreneau) => {
        const creneauxRef = ref(db, 'creneaux');
        await push(creneauxRef, {
            ...nouveauCreneau,
            createdAt: serverTimestamp(),
        });
    };

    // ── Modification complète d'un créneau (formulaire) ──
    const modifierCreneau = async (id, donnees) => {
        const creneauRef = ref(db, `creneaux/${id}`);
        await update(creneauRef, donnees);
    };

    // ── Bascule rapide Actif / Inactif ──
    const toggleStatutCreneau = async (creneau) => {
        const nouveauStatut = creneau.statut === 'Actif' ? 'Inactif' : 'Actif';
        const creneauRef = ref(db, `creneaux/${creneau.id}`);
        await update(creneauRef, { statut: nouveauStatut });
    };

    // ── Suppression d'un créneau ──
    const supprimerCreneau = async (id) => {
        if (!window.confirm('Supprimer ce créneau ?')) return;
        const creneauRef = ref(db, `creneaux/${id}`);
        await remove(creneauRef);
    };

    // ── Fait avancer le statut d'un rendez-vous (En attente → Confirmé → En expédition → Terminé → ...) ──
    const avancerStatutRendezVous = async (rdv) => {
        const nouveauStatut = prochainStatutRdv(rdv.statut);
        const rdvRef = ref(db, `rendezVous/${rdv.id}`);
        await update(rdvRef, { statut: nouveauStatut });
    };

    // ── Confirme que le colis a été déposé / récupéré → passe le rendez-vous "En expédition" ──
    const confirmerColisTraite = async (rdv) => {
        if (!window.confirm(messageConfirmationColis(rdv.categorieService))) return;
        const rdvRef = ref(db, `rendezVous/${rdv.id}`);
        await update(rdvRef, {
            statut: 'En expédition',
            colisConfirmeLe: serverTimestamp(),
        });
    };

    // ── Annule un rendez-vous ──
    const annulerRendezVous = async (id) => {
        if (!window.confirm('Annuler ce rendez-vous ?')) return;
        const rdvRef = ref(db, `rendezVous/${id}`);
        await update(rdvRef, { statut: 'Annulé' });
    };

    // ── Supprime définitivement un rendez-vous ──
    const supprimerRendezVous = async (id) => {
        if (!window.confirm('Supprimer définitivement ce rendez-vous ?')) return;
        const rdvRef = ref(db, `rendezVous/${id}`);
        await remove(rdvRef);
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

    const titresSection = {
        dashboard: 'Tableau de bord',
        rendezvous: 'Rendez-vous',
        creneaux: 'Créneaux disponibles',
        clients: 'Clients',
    };

    return (
        <>
            <div className={styles.disposition}>

                {/* ── Barre latérale ── */}
                <aside className={styles.barre_laterale}>
                    <div className={styles.barre_laterale_logo}>
                        <img src={logo} alt="Logo GVIP" className={styles.image_logo} />
                    </div>

                    <nav className={styles.navigation}>
                        {navItems.map((item) => (
                            <div
                                key={item.id}
                                className={`${styles.element_nav} ${sectionActive === item.id ? styles.element_nav_actif : ''}`}
                                onClick={() => setSectionActive(item.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* ── Contenu principal ── */}
                <main className={styles.contenu_principal}>
                    <h1 className={styles.titre_page}>{titresSection[sectionActive]}</h1>

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
                                        <table className={styles.tableau}>
                                            <thead>
                                                <tr>
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
                                    )}
                                    <p className={styles.voir_tous} onClick={() => setSectionActive('rendezvous')}>
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
                                    )}
                                    <p className={styles.voir_tous} onClick={() => setSectionActive('creneaux')}>
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

                            {loadingRendezVous ? (
                                <p className={styles.sous_texte_stat}>Chargement des rendez-vous...</p>
                            ) : rendezVous.length === 0 ? (
                                <p className={styles.sous_texte_stat}>Aucun rendez-vous pour le moment.</p>
                            ) : (
                                <table className={styles.tableau}>
                                    <thead>
                                        <tr>
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
                                        {rendezVous.map((r) => {
                                            const peutConfirmerColis = r.statut === 'Confirmé';
                                            const paysCreneauRdv = r.creneauPays || 'CI';
                                            return (
                                                <tr key={r.id}>
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
                            )}
                        </div>
                    )}

                    {/* ── Section : Clients ── */}
                    {sectionActive === 'clients' && (
                        <div className={styles.carte_tableau}>
                            <h2 className={styles.titre_tableau}>Liste des clients</h2>

                            {loadingRendezVous ? (
                                <p className={styles.sous_texte_stat}>Chargement des clients...</p>
                            ) : clients.length === 0 ? (
                                <p className={styles.sous_texte_stat}>Aucun client pour le moment.</p>
                            ) : (
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
                                        {clients.map((c, i) => (
                                            <tr key={i}>
                                                <td>{c.nom}</td>
                                                <td>{c.telephone}</td>
                                                <td>{c.email}</td>
                                                <td>{c.nbRendezVous}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
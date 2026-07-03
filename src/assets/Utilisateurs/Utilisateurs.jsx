import { useState, useEffect, useRef } from 'react'
import { useMediaQuery } from 'react-responsive'
import { DayPicker } from 'react-day-picker'
import "react-day-picker/dist/style.css";
import styles from './Utilisateurs.module.css'
import logo from '../logo_entreprise.png'
import {
    FaArrowDown, FaArrowUp, FaCalendarAlt, FaCheckCircle, FaWhatsapp, FaRegCalendarAlt,
    FaArrowRight, FaBicycle, FaMotorcycle, FaExclamationTriangle, FaTimesCircle, FaClock,
    FaBan, FaRedo, FaMapMarkerAlt, FaBoxOpen, FaUser, FaPhoneAlt, FaStickyNote, FaTag,
    FaRulerCombined, FaCheck, FaHourglassHalf, FaPaperPlane, FaTruck, FaChevronDown
} from 'react-icons/fa'
import { FiPackage } from 'react-icons/fi'
import { Bs1CircleFill, Bs2CircleFill, Bs3CircleFill, Bs4CircleFill } from "react-icons/bs";
import { CI, FR } from 'country-flag-icons/react/3x2';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, update } from 'firebase/database';

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

// ── Formate un objet Date en "YYYY-MM-DD" (même format que stocké dans Firebase) ──
function formatDateISO(date) {
    if (!date) return '';
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
}

// ── Transforme "2026-06-30" en "30 juin 2026" ──
function formatDateLisible(dateISO) {
    if (!dateISO) return '';
    const [annee, mois, jour] = dateISO.split('-');
    const date = new Date(Number(annee), Number(mois) - 1, Number(jour));
    if (Number.isNaN(date.getTime())) return dateISO;
    const texte = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return texte;
}

// ── Normalise le champ "type" d'un créneau Firebase en "recuperation" ou "depot" ──
function normaliserTypeCreneau(type) {
    if (!type) return null;
    const t = type
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (t.includes('recup')) return 'recuperation';
    if (t.includes('depot')) return 'depot';
    return null;
}

// ── Les 4 options de service colis ──
const OPTIONS_COLIS = [
    {
        id: 'recup_moi',
        categorie: 'recuperation',
        direction: 'up',
        Icone: FiPackage,
        titre: 'GVIP vient récupérer',
        sousTitre: 'Je fais récupérer mon colis',
        alerte: false,
    },
    {
        id: 'gvip_recupere',
        categorie: 'recuperation',
        direction: 'up',
        Icone: FaBicycle,
        titre: 'GVIP vient récupérer pour vous apporter',
        sousTitre: 'Un livreur passe chez vous',
        alerte: true,
    },
    {
        id: 'depot_point',
        categorie: 'depot',
        direction: 'down',
        Icone: FiPackage,
        titre: 'Je dépose le colis',
        sousTitre: 'Dans un point GVIP',
        alerte: false,
    },
    {
        id: 'livreur_depot',
        categorie: 'depot',
        direction: 'down',
        Icone: FaMotorcycle,
        titre: 'Un livreur dépose le colis',
        sousTitre: 'Dans un point GVIP',
        alerte: true,
    },
];

// ── Libellés lisibles pour les champs optionnels stockés en valeur brute ──
const LIBELLES_TYPE_COLIS = {
    electronique: 'Électronique',
    nourriture: 'Nourriture',
    vetements: 'Vêtements',
    documents: 'Documents',
    medicaments: 'Médicaments',
    fragile: 'Fragile / Verre',
    cosmetiques: 'Cosmétiques',
    meubles: 'Meubles',
    autre: 'Autre',
};

const LIBELLES_TAILLE_COLIS = {
    petit: 'Petit (moins de 30cm)',
    moyen: 'Moyen (30cm - 60cm)',
    grand: 'Grand (60cm - 100cm)',
    'tres-grand': 'Très grand (plus de 100cm)',
};

function libelleTypeColis(valeur) {
    if (!valeur) return null;
    return LIBELLES_TYPE_COLIS[valeur] || valeur;
}

function libelleTailleColis(valeur) {
    if (!valeur) return null;
    return LIBELLES_TAILLE_COLIS[valeur] || valeur;
}

// ── Destinations possibles (select) ──
const OPTIONS_DESTINATION = [
    { code: 'CI', label: "Côte d'Ivoire" },
    { code: 'FR', label: 'France' },
];

// ── Pays disponibles pour l'indicatif téléphonique (sélecteur à drapeau) ──
const INDICATIFS_PAYS = {
    CI: { indicatif: '+225', label: "Côte d'Ivoire", Drapeau: CI, placeholder: '07 00 00 00 00' },
    FR: { indicatif: '+33', label: 'France', Drapeau: FR, placeholder: '6 00 00 00 00' },
};

// ── État initial du formulaire ──
const FORMULAIRE_VIDE = {
    nomComplet: '',
    telephone: '',
    email: '',
    typeColis: '',
    tailleColis: '',
    destination: '',
    adresse: '',
    notes: '',
};

// ── Clé utilisée pour stocker le "token" (= id Firebase du rendez-vous) dans le navigateur du client ──
const CLE_TOKEN_RDV = 'gvip_token_rdv';

// ── Libellé lisible pour la catégorie de service ──
function libelleCategorieRdv(categorie) {
    if (categorie === 'recuperation') return 'Récupération';
    if (categorie === 'depot') return 'Dépôt';
    return '—';
}

// ── Couleur/texte associés à chaque statut de rendez-vous ──
function infosStatutRdv(statut) {
    switch (statut) {
        case 'Confirmé':
            return { couleur: '#16a34a', fond: '#f0fdf4', bordure: '#bbf7d0', texte: 'Confirmé' };
        case 'En expédition':
            return { couleur: '#2563eb', fond: '#eff6ff', bordure: '#bfdbfe', texte: 'En expédition' };
        case 'Terminé':
            return { couleur: '#4b5563', fond: '#f3f4f6', bordure: '#e5e7eb', texte: 'Terminé' };
        case 'Annulé':
            return { couleur: '#dc2626', fond: '#fef2f2', bordure: '#fecaca', texte: 'Annulé' };
        default:
            return { couleur: '#f97316', fond: '#fff7ed', bordure: '#fed7aa', texte: 'En attente' };
    }
}

// ── Les étapes du parcours d'un rendez-vous, affichées sous forme de timeline verticale ──
function construireEtapesSuivi(rdv) {
    const estDepot = rdv.categorieService === 'depot';

    const etapes = [
        {
            id: 1,
            Icone: FaPaperPlane,
            titre: 'Demande envoyée',
            description: 'Votre demande de rendez-vous a bien été reçue par notre équipe.',
        },
        {
            id: 2,
            Icone: FaWhatsapp,
            titre: 'Confirmation',
            description: 'Nous vous contactons sur WhatsApp pour confirmer le créneau choisi.',
        },
        {
            id: 3,
            Icone: estDepot ? FiPackage : FaTruck,
            titre: estDepot ? 'Dépôt du colis' : 'Récupération du colis',
            description: estDepot
                ? 'Déposez votre colis au point GVIP à l\'horaire convenu.'
                : 'Un livreur GVIP passe récupérer votre colis à l\'horaire convenu.',
        },
        {
            id: 4,
            Icone: FaTruck,
            titre: 'En expédition',
            description: 'Votre colis est pris en charge et en route vers sa destination.',
        },
        {
            id: 5,
            Icone: FaCheckCircle,
            titre: 'Livré',
            description: 'Votre colis est arrivé en toute sécurité à destination.',
        },
    ];

    let etapeCourante = 1;
    if (rdv.statut === 'Confirmé') etapeCourante = 3;
    if (rdv.statut === 'En expédition') etapeCourante = 4;
    if (rdv.statut === 'Terminé') etapeCourante = 5;

    return { etapes, etapeCourante };
}

// ── Carte d'option réutilisable (desktop + mobile) ──
function CarteOption({ option, active, onClick, enErreur }) {
    const { Icone, direction, titre, sousTitre, alerte } = option;
    return (
        <div
            className={`${styles.carte_option} ${active ? styles.carte_option_active : ''} ${enErreur ? styles.carte_option_erreur : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
        >
            <div className={styles.carte_icone_cercle}>
                {direction === 'up' ? <FaArrowUp size={9} /> : <FaArrowDown size={9} />}
                <Icone size={20} />
            </div>
            <div className={styles.carte_textes}>
                <p className={styles.carte_titre}>{titre}</p>
                <p className={styles.carte_sous_titre}>{sousTitre}</p>
            </div>
            {alerte ? (
                <FaExclamationTriangle size={18} className={styles.carte_alerte} />
            ) : (
                active && <FaCheckCircle size={18} className={styles.carte_check} />
            )}
        </div>
    );
}

// ── Sélecteur de pays pour le téléphone (drapeau + indicatif, cliquable) ──
function SelecteurPaysTelephone({ paysActif, ouvert, onToggle, onChoisir, wrapperRef }) {
    const { Drapeau, indicatif } = INDICATIFS_PAYS[paysActif];
    return (
        <div className={styles.selecteur_pays_wrapper} ref={wrapperRef}>
            <button
                type="button"
                className={styles.selecteur_pays_bouton}
                onClick={onToggle}
            >
                <Drapeau className={styles.selecteur_pays_drapeau} />
                <span className={styles.selecteur_pays_indicatif}>{indicatif}</span>
                <FaChevronDown size={9} className={styles.selecteur_pays_chevron} />
            </button>
            {ouvert && (
                <div className={styles.selecteur_pays_menu}>
                    {Object.entries(INDICATIFS_PAYS).map(([code, info]) => (
                        <div
                            key={code}
                            className={`${styles.selecteur_pays_option} ${paysActif === code ? styles.selecteur_pays_option_active : ''}`}
                            onClick={() => onChoisir(code)}
                        >
                            <info.Drapeau className={styles.selecteur_pays_drapeau} />
                            <span className={styles.selecteur_pays_option_label}>{info.label}</span>
                            <span className={styles.selecteur_pays_option_indicatif}>{info.indicatif}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Bandeau de message de confirmation / erreur après envoi ──
function MessageEnvoi({ message, styleClasse }) {
    if (!message) return null;
    const estSucces = message.type === 'success';
    return (
        <div className={`${styleClasse} ${estSucces ? styles.message_succes : styles.message_erreur}`}>
            {estSucces ? <FaCheckCircle size={16} /> : <FaTimesCircle size={16} />}
            <p>{message.texte}</p>
        </div>
    );
}

// ── Une ligne du détail du rendez-vous (icône + libellé + valeur) ──
function LigneDetail({ Icone, libelle, valeur }) {
    if (!valeur) return null;
    return (
        <div className={styles.s2_ligne_detail}>
            <div className={styles.s2_detail_icone}>
                <Icone size={14} />
            </div>
            <div className={styles.s2_detail_textes}>
                <p className={styles.s2_detail_libelle}>{libelle}</p>
                <p className={styles.s2_detail_valeur}>{valeur}</p>
            </div>
        </div>
    );
}

// ── Timeline verticale façon "étapes numérotées" ──
function TimelineSuivi({ rdv }) {
    const { etapes, etapeCourante } = construireEtapesSuivi(rdv);

    return (
        <div className={styles.s2_timeline}>
            {etapes.map((etape, index) => {
                const estFait = etape.id < etapeCourante;
                const estCourant = etape.id === etapeCourante;
                const estDernier = index === etapes.length - 1;
                const { Icone } = etape;

                return (
                    <div key={etape.id} className={styles.s2_timeline_ligne}>
                        <div className={styles.s2_timeline_colonne_gauche}>
                            <div
                                className={`${styles.s2_pastille} ${estFait ? styles.s2_pastille_fait : ''} ${estCourant ? styles.s2_pastille_courant : ''}`}
                            >
                                {estFait ? <FaCheck size={11} /> : etape.id}
                            </div>
                            {!estDernier && (
                                <div className={`${styles.s2_trait} ${estFait ? styles.s2_trait_fait : ''}`} />
                            )}
                        </div>

                        <div className={styles.s2_timeline_colonne_droite}>
                            {estCourant ? (
                                <div className={styles.s2_carte_etape_active}>
                                    <div className={styles.s2_carte_etape_icone}>
                                        <Icone size={20} />
                                    </div>
                                    <div>
                                        <p className={styles.s2_carte_etape_titre}>{etape.titre}</p>
                                        <p className={styles.s2_carte_etape_desc}>{etape.description}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className={`${styles.s2_etape_titre_simple} ${estFait ? styles.s2_etape_titre_fait : ''}`}>
                                    {etape.titre}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Page affichée quand le visiteur a déjà un rendez-vous en cours (token reconnu) ──
function SuiviRendezVous({ rdv, onAnnuler, onNouvelleDemande, annulationEnCours }) {
    const statutInfos = infosStatutRdv(rdv.statut);
    const peutAnnuler = rdv.statut === 'En attente';
    const peutReprendre = rdv.statut === 'Terminé' || rdv.statut === 'Annulé';
    const estAnnule = rdv.statut === 'Annulé';

    return (
        <div className={styles.s2_page}>
            <div className={styles.s2_conteneur}>

                {/* ── En-tête ── */}
                <div className={styles.s2_entete}>
                    <img src={logo} alt="Logo GVIP" className={styles.s2_logo} />
                    <div
                        className={styles.s2_badge_statut}
                        style={{ color: statutInfos.couleur, background: statutInfos.fond, borderColor: statutInfos.bordure }}
                    >
                        <FaClock size={11} />
                        {statutInfos.texte}
                    </div>
                </div>

                <h1 className={styles.s2_titre}>Suivi de votre rendez-vous</h1>
                <p className={styles.s2_sous_titre}>
                    {rdv.statut === 'En attente' && "Nous allons vous contacter sur WhatsApp pour confirmer votre créneau."}
                    {rdv.statut === 'Confirmé' && "Votre rendez-vous est confirmé, à très vite !"}
                    {rdv.statut === 'En expédition' && "Votre colis a été pris en charge et est en route vers sa destination."}
                    {rdv.statut === 'Terminé' && "Ce rendez-vous est terminé. Merci d'avoir utilisé GVIP."}
                    {rdv.statut === 'Annulé' && "Ce rendez-vous a été annulé."}
                </p>

                {/* ── Timeline des étapes (masquée si annulé) ── */}
                {!estAnnule ? (
                    <div className={styles.s2_bloc}>
                        <p className={styles.s2_bloc_titre}>Étapes du parcours</p>
                        <TimelineSuivi rdv={rdv} />
                    </div>
                ) : (
                    <div className={styles.s2_bloc_annule}>
                        <div className={styles.s2_icone_annule}>
                            <FaBan size={22} />
                        </div>
                        <p className={styles.s2_annule_titre}>Demande annulée</p>
                        <p className={styles.s2_annule_texte}>
                            Vous pouvez prendre un nouveau rendez-vous à tout moment.
                        </p>
                    </div>
                )}

                {/* ── Détails de la commande ── */}
                <div className={styles.s2_bloc}>
                    <p className={styles.s2_bloc_titre}>Détails de la commande</p>
                    <div className={styles.s2_carte_details}>

                        <div className={styles.s2_resume_service}>
                            <div className={styles.s2_resume_icone}>
                                {rdv.categorieService === 'depot' ? <FiPackage size={18} /> : <FaTruck size={18} />}
                            </div>
                            <div>
                                <p className={styles.s2_resume_categorie}>{libelleCategorieRdv(rdv.categorieService)}</p>
                                <p className={styles.s2_resume_date}>
                                    {formatDateLisible(rdv.date)} · {rdv.heureDebut} - {rdv.heureFin}
                                </p>
                            </div>
                        </div>

                        <div className={styles.s2_separateur} />

                        <div className={styles.s2_grille_details}>
                            <LigneDetail Icone={FaUser} libelle="Contact" valeur={rdv.nomComplet} />
                            <LigneDetail Icone={FaPhoneAlt} libelle="Téléphone" valeur={rdv.telephone} />
                            <LigneDetail Icone={FaMapMarkerAlt} libelle="Destination" valeur={rdv.destination} />
                            <LigneDetail Icone={FaMapMarkerAlt} libelle="Adresse" valeur={rdv.adresse} />
                            <LigneDetail Icone={FaTag} libelle="Type de colis" valeur={libelleTypeColis(rdv.typeColis)} />
                            <LigneDetail Icone={FaRulerCombined} libelle="Taille" valeur={libelleTailleColis(rdv.tailleColis)} />
                            <LigneDetail Icone={FaBoxOpen} libelle="Notes" valeur={rdv.notes} />
                        </div>
                    </div>
                </div>

                {/* ── Actions ── */}
                <div className={styles.s2_actions}>
                    {peutAnnuler && (
                        <button className={styles.s2_bouton_secondaire} onClick={onAnnuler} disabled={annulationEnCours}>
                            <FaBan size={13} />
                            {annulationEnCours ? 'Annulation...' : 'Annuler ma demande'}
                        </button>
                    )}
                    {peutReprendre && (
                        <button className={styles.s2_bouton_principal} onClick={onNouvelleDemande}>
                            <FaRedo size={13} />
                            Prendre un nouveau rendez-vous
                        </button>
                    )}
                </div>

                <div className={styles.s2_whatsapp}>
                    <FaWhatsapp size={16} color="#16a34a" />
                    <p>+225 07 49 49 49 49</p>
                </div>
            </div>
        </div>
    );
}

function Utilisateur() {

    const isDesktop = useMediaQuery({ minWidth: 768 });
    const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1024 });

    // ── Créneaux récupérés depuis Firebase ──
    const [creneaux, setCreneaux] = useState([]);
    const [loadingCreneaux, setLoadingCreneaux] = useState(true);

    // ── Date et créneau sélectionnés par l'utilisateur ──
    const [dateSelectionnee, setDateSelectionnee] = useState(null);
    const [creneauSelectionne, setCreneauSelectionne] = useState(null);

    // ── Option de service colis sélectionnée (une des 4 cartes) ──
    // Aucune option n'est sélectionnée par défaut : le client DOIT choisir.
    const [optionSelectionnee, setOptionSelectionnee] = useState(null);
    const [erreurOption, setErreurOption] = useState(false);
    const optionActive = OPTIONS_COLIS.find((o) => o.id === optionSelectionnee);
    const categorieActive = optionActive?.categorie; // 'recuperation' | 'depot'

    // ── Champs du formulaire ──
    const [formData, setFormData] = useState(FORMULAIRE_VIDE);

    // ── Pays sélectionné pour l'indicatif téléphonique + état du menu déroulant ──
    const [paysTelephone, setPaysTelephone] = useState('CI');
    const [menuPaysOuvert, setMenuPaysOuvert] = useState(false);
    const refSelecteurPays = useRef(null);

    // ── Ferme le menu du sélecteur de pays si on clique en dehors ──
    useEffect(() => {
        if (!menuPaysOuvert) return;
        const fermerSiExterieur = (e) => {
            if (refSelecteurPays.current && !refSelecteurPays.current.contains(e.target)) {
                setMenuPaysOuvert(false);
            }
        };
        document.addEventListener('mousedown', fermerSiExterieur);
        return () => document.removeEventListener('mousedown', fermerSiExterieur);
    }, [menuPaysOuvert]);

    const choisirPaysTelephone = (code) => {
        setPaysTelephone(code);
        setMenuPaysOuvert(false);
    };

    // ── État d'envoi vers Firebase ──
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [messageEnvoi, setMessageEnvoi] = useState(null); // { type: 'success' | 'error', texte: string }

    // ── Token de rendez-vous existant (id Firebase stocké dans le navigateur du client) ──
    const [tokenRdv, setTokenRdv] = useState(() => {
        try {
            return localStorage.getItem(CLE_TOKEN_RDV);
        } catch {
            return null;
        }
    });
    const [rdvExistant, setRdvExistant] = useState(null);
    const [chargementTokenRdv, setChargementTokenRdv] = useState(Boolean(tokenRdv));
    const [annulationEnCours, setAnnulationEnCours] = useState(false);

    // ── Si un token est présent, on écoute en temps réel le rendez-vous correspondant.
    //    Ça permet aussi de mettre à jour automatiquement la page si l'admin change le statut. ──
    useEffect(() => {
        if (!tokenRdv) {
            setChargementTokenRdv(false);
            setRdvExistant(null);
            return;
        }

        const rdvRef = ref(db, `rendezVous/${tokenRdv}`);
        const unsubscribe = onValue(rdvRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setRdvExistant({ id: tokenRdv, ...data });
            } else {
                // Le token ne correspond plus à rien (supprimé côté admin) → on l'efface
                try { localStorage.removeItem(CLE_TOKEN_RDV); } catch { }
                setTokenRdv(null);
                setRdvExistant(null);
            }
            setChargementTokenRdv(false);
        }, () => {
            setChargementTokenRdv(false);
        });

        return () => unsubscribe();
    }, [tokenRdv]);

    // ── Le client annule lui-même sa demande en attente ──
    const annulerMaDemande = async () => {
        if (!tokenRdv) return;
        setAnnulationEnCours(true);
        try {
            await update(ref(db, `rendezVous/${tokenRdv}`), { statut: 'Annulé' });
        } catch (error) {
            console.error("Erreur lors de l'annulation :", error);
        } finally {
            setAnnulationEnCours(false);
        }
    };

    // ── Le client efface son token pour pouvoir reprendre un nouveau rendez-vous ──
    const reprendreNouvelleDemande = () => {
        try { localStorage.removeItem(CLE_TOKEN_RDV); } catch { }
        setTokenRdv(null);
        setRdvExistant(null);
    };

    // ── Références vers les sections du header pour le scroll ──
    const refRendezVous = useRef(null);
    const refCommentCaMarche = useRef(null);
    const refAPropos = useRef(null);
    const refContact = useRef(null);

    // ── Lecture en temps réel des créneaux dans Firebase ──
    useEffect(() => {
        const creneauxRef = ref(db, 'creneaux');

        const unsubscribe = onValue(creneauxRef, (snapshot) => {
            const data = snapshot.val() || {};
            const liste = Object.entries(data).map(([id, val]) => ({
                id,
                ...val,
            }));

            setCreneaux(liste);
            setLoadingCreneaux(false);
        }, (error) => {
            console.error("Erreur lecture créneaux :", error);
            setLoadingCreneaux(false);
        });

        return () => unsubscribe();
    }, []);

    // ── Créneaux actifs disponibles pour la date sélectionnée ET la catégorie choisie (récupération / dépôt) ──
    const dateISO = formatDateISO(dateSelectionnee);
    const creneauxDuJour = creneaux.filter((c) => {
        if (c.statut !== 'Actif' || c.date !== dateISO) return false;
        const typeNormalise = normaliserTypeCreneau(c.type);
        if (typeNormalise && categorieActive) {
            return typeNormalise === categorieActive;
        }
        return true;
    });

    const choisirDate = (date) => {
        setDateSelectionnee(date);
        setCreneauSelectionne(null);
    };

    const choisirCreneau = (creneau) => {
        setCreneauSelectionne(creneau);
    };

    const choisirOption = (id) => {
        setOptionSelectionnee(id);
        setCreneauSelectionne(null);
        setErreurOption(false);
    };

    // ── Met à jour un champ du formulaire ──
    const majFormulaire = (champ, valeur) => {
        setFormData((prev) => ({ ...prev, [champ]: valeur }));
    };

    // ── Scroll fluide vers une section quand on clique dans le header ──
    const allerVers = (ref) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ── Validation simple des champs obligatoires ──
    const formulaireValide = () => {
        return (
            optionSelectionnee !== null &&
            formData.nomComplet.trim() !== '' &&
            formData.telephone.trim() !== '' &&
            formData.destination.trim() !== '' &&
            formData.adresse.trim() !== '' &&
            dateSelectionnee !== null &&
            creneauSelectionne !== null
        );
    };

    // ── Envoi du rendez-vous vers Firebase (nouvelle branche "rendezVous") ──
    const envoyerRendezVous = async () => {
        setMessageEnvoi(null);
        setErreurOption(optionSelectionnee === null);

        if (!formulaireValide()) {
            setMessageEnvoi({
                type: 'error',
                texte: "Merci de remplir tous les champs obligatoires (*), de choisir un mode de récupération/dépôt, une date et un créneau horaire.",
            });
            return;
        }

        setEnvoiEnCours(true);
        try {
            const rendezVousRef = ref(db, 'rendezVous');
            const nouvelleEntreeRef = push(rendezVousRef);

            await set(nouvelleEntreeRef, {
                nomComplet: formData.nomComplet.trim(),
                telephone: `${INDICATIFS_PAYS[paysTelephone].indicatif} ${formData.telephone.trim()}`,
                paysTelephone,
                email: formData.email.trim() || null,
                typeColis: formData.typeColis || null,
                tailleColis: formData.tailleColis || null,
                destination: formData.destination.trim(),
                adresse: formData.adresse.trim(),
                notes: formData.notes.trim() || null,
                optionService: optionSelectionnee,
                categorieService: categorieActive,
                date: dateISO,
                creneauId: creneauSelectionne.id,
                heureDebut: creneauSelectionne.heureDebut,
                heureFin: creneauSelectionne.heureFin,
                statut: 'En attente',
                dateCreation: Date.now(),
            });

            setMessageEnvoi({
                type: 'success',
                texte: "Votre rendez-vous a bien été enregistré ! Nous vous contacterons sur WhatsApp pour confirmer.",
            });

            // On garde une trace du rendez-vous côté client (token = id Firebase),
            // pour reconnaître ce visiteur s'il revient sur le site.
            try { localStorage.setItem(CLE_TOKEN_RDV, nouvelleEntreeRef.key); } catch { }
            setTokenRdv(nouvelleEntreeRef.key);

            // Réinitialisation du formulaire après succès
            setFormData(FORMULAIRE_VIDE);
            setDateSelectionnee(null);
            setCreneauSelectionne(null);
            setOptionSelectionnee(null);
            setErreurOption(false);
        } catch (error) {
            console.error("Erreur lors de l'envoi du rendez-vous :", error);
            setMessageEnvoi({
                type: 'error',
                texte: "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
            });
        } finally {
            setEnvoiEnCours(false);
        }
    };

    return (
        <>
            {chargementTokenRdv ? (
                <div className={styles.page_chargement}>
                    <p>Chargement...</p>
                </div>
            ) : rdvExistant ? (
                <SuiviRendezVous
                    rdv={rdvExistant}
                    onAnnuler={annulerMaDemande}
                    onNouvelleDemande={reprendreNouvelleDemande}
                    annulationEnCours={annulationEnCours}
                />
            ) : (
                <>
                    {isDesktop && (

                        <div className={styles.desktop}>
                            <div className={styles.header}>
                                <div className={styles.logo}>
                                    <img className={styles.logo_img} src={logo} alt="Logo" />
                                </div>
                                <div className={styles.navigation}>
                                    <p onClick={() => allerVers(refRendezVous)} style={{ cursor: 'pointer' }}>Prendre un rendez-vous</p>
                                    <p onClick={() => allerVers(refCommentCaMarche)} style={{ cursor: 'pointer' }}>Comment ça marche</p>
                                    <p onClick={() => allerVers(refAPropos)} style={{ cursor: 'pointer' }}>A propos</p>
                                    <p onClick={() => allerVers(refContact)} style={{ cursor: 'pointer' }}>Contact</p>
                                </div>
                                <div className={styles.whatsapp} ref={refContact}>
                                    <FaWhatsapp color='#4caf50' size={30} />
                                    <div className={styles.numero}>
                                        <p>+225 07 49 49 49 49</p>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.phrases_informatives} ref={refAPropos}>
                                <p className={styles.titre_section}>PRISE DE RENDEZ-VOUS</p>
                                <p className={styles.titre_principal}>Reservez votre rendez-vous colis</p>
                                <p>Planifiez facilement l'enlevement ou le depot de votre colis</p>
                                <div className={styles.competences}>
                                    <p><span className={styles.point}>•</span> Rapide</p>
                                    <p><span className={styles.point}>•</span> Fiable</p>
                                    <p><span className={styles.point}>•</span> Sécuriser</p>
                                </div>
                            </div>

                            {/* ─── Cartes options (nouveau design clair) ─── */}
                            <div className={`${styles.grille_options_desktop} ${erreurOption ? styles.grille_options_erreur : ''}`}>
                                {OPTIONS_COLIS.map((option) => (
                                    <CarteOption
                                        key={option.id}
                                        option={option}
                                        active={optionSelectionnee === option.id}
                                        onClick={() => choisirOption(option.id)}
                                        enErreur={erreurOption}
                                    />
                                ))}
                            </div>
                            {erreurOption && (
                                <p className={styles.option_erreur_texte}>
                                    Merci de sélectionner un mode de récupération / dépôt ci-dessus.
                                </p>
                            )}

                            <div className={styles.renseignements} ref={refRendezVous}>
                                <div className={styles.formulaire}>
                                    <p className={styles.titre_formulaire}>Vos informations</p>
                                    <div className={styles.informations_personnelles}>
                                        <div className={styles.nom_complet}>
                                            <p>Nom complet <span className={styles.asterix}>*</span></p>
                                            <div className={styles.champs}>
                                                <input
                                                    className={styles.input}
                                                    type="text"
                                                    placeholder="Entrez votre nom complet"
                                                    value={formData.nomComplet}
                                                    onChange={(e) => majFormulaire('nomComplet', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.telephone_et_whatsapp}>
                                            <p>Télephone / WhatsApp <span className={styles.asterix}>*</span></p>
                                            <div className={styles.champs}>
                                                <SelecteurPaysTelephone
                                                    paysActif={paysTelephone}
                                                    ouvert={menuPaysOuvert}
                                                    onToggle={() => setMenuPaysOuvert((v) => !v)}
                                                    onChoisir={choisirPaysTelephone}
                                                    wrapperRef={refSelecteurPays}
                                                />
                                                <input
                                                    className={styles.input}
                                                    type="text"
                                                    placeholder={INDICATIFS_PAYS[paysTelephone].placeholder}
                                                    value={formData.telephone}
                                                    onChange={(e) => majFormulaire('telephone', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.email}>
                                            <p>Email (optionnel) <span className={styles.asterix}>*</span></p>
                                            <div className={styles.champs}>
                                                <input
                                                    className={styles.input}
                                                    type="email"
                                                    placeholder="Entrez votre email"
                                                    value={formData.email}
                                                    onChange={(e) => majFormulaire('email', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.informations_colis}>
                                        <div className={styles.type}>
                                            <p>Type de colis (optionnel)</p>
                                            <div className={styles.champs}>
                                                <select
                                                    className={styles.input}
                                                    value={formData.typeColis}
                                                    onChange={(e) => majFormulaire('typeColis', e.target.value)}
                                                >
                                                    <option value="">Sélectionnez un type de colis</option>
                                                    <option value="electronique">Électronique</option>
                                                    <option value="nourriture">Nourriture</option>
                                                    <option value="vetements">Vêtements</option>
                                                    <option value="documents">Documents</option>
                                                    <option value="medicaments">Médicaments</option>
                                                    <option value="fragile">Fragile / Verre</option>
                                                    <option value="cosmetiques">Cosmétiques</option>
                                                    <option value="meubles">Meubles</option>
                                                    <option value="autre">Autre</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className={styles.taille}>
                                            <p>Taille du colis (optionnel)</p>
                                            <div className={styles.champs}>
                                                <select
                                                    className={styles.input}
                                                    value={formData.tailleColis}
                                                    onChange={(e) => majFormulaire('tailleColis', e.target.value)}
                                                >
                                                    <option value="">Sélectionnez une taille de colis</option>
                                                    <option value="petit">Petit (moins de 30cm)</option>
                                                    <option value="moyen">Moyen (30cm - 60cm)</option>
                                                    <option value="grand">Grand (60cm - 100cm)</option>
                                                    <option value="tres-grand">Très grand (plus de 100cm)</option>
                                                </select></div>
                                        </div>
                                        <div className={styles.destination}>
                                            <p>Destination <span className={styles.asterix}>*</span></p>
                                            <div className={styles.champs}>
                                                <select
                                                    className={styles.input}
                                                    value={formData.destination}
                                                    onChange={(e) => majFormulaire('destination', e.target.value)}
                                                >
                                                    <option value="">Sélectionnez une destination</option>
                                                    {OPTIONS_DESTINATION.map((d) => (
                                                        <option key={d.code} value={d.label}>
                                                            {d.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <p className={styles.adresse}>Adresse / ville <span className={styles.asterix}>*</span></p>
                                    <div className={styles.champs_adresse_ville}>
                                        <input
                                            className={styles.input_adresse}
                                            type="text"
                                            placeholder="Entrez votre adresse / ville"
                                            value={formData.adresse}
                                            onChange={(e) => majFormulaire('adresse', e.target.value)}
                                        />
                                    </div>


                                    <div className={styles.date_recuperation}>
                                        <div className={styles.date_de_rendez_vous}>
                                            <p>Date de rendez-vous <span className={styles.asterix}>*</span></p>
                                            <input
                                                className={styles.input_rendez_vous}
                                                type="date"
                                                placeholder='Sélectionner une date'
                                                value={dateISO}
                                                onChange={(e) => choisirDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                                            />
                                        </div>
                                        <div className={styles.crenaux_horaires}>
                                            <p>Créneau horaire disponible <span className={styles.asterix}>*</span></p>
                                            {!dateSelectionnee ? (
                                                <p className={styles.input_creanau_horaire}>Choisissez d'abord une date</p>
                                            ) : loadingCreneaux ? (
                                                <p className={styles.input_creanau_horaire}>Chargement des créneaux...</p>
                                            ) : creneauxDuJour.length === 0 ? (
                                                <p className={styles.input_creanau_horaire}>Aucun créneau disponible ce jour-là</p>
                                            ) : (
                                                <select
                                                    className={styles.input_creanau_horaire}
                                                    value={creneauSelectionne?.id || ''}
                                                    onChange={(e) => {
                                                        const c = creneauxDuJour.find((cr) => cr.id === e.target.value);
                                                        choisirCreneau(c || null);
                                                    }}
                                                >
                                                    <option value="">Sélectionnez un créneau</option>
                                                    {creneauxDuJour.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.type} · {c.heureDebut} - {c.heureFin}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.notes}>
                                        <p>Notes complementaires (optionnel) </p>
                                        <div className={styles.champs_notes}>
                                            <input
                                                className={styles.input_notes}
                                                type="text"
                                                placeholder='Intructions particulières ?'
                                                value={formData.notes}
                                                onChange={(e) => majFormulaire('notes', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.bouton}>
                                        <button className={styles.button} onClick={envoyerRendezVous} disabled={envoiEnCours}>
                                            <FaCalendarAlt />
                                            <p>{envoiEnCours ? 'Envoi en cours...' : 'Confirmez le rendez-vous'}</p>
                                        </button>
                                    </div>
                                    <MessageEnvoi message={messageEnvoi} styleClasse={styles.message_envoi} />
                                    <div className={styles.conditions_generales}>
                                        <p>En confirmant, vous acceptez nos <span className={styles.conditions} >Conditions générales</span></p>
                                    </div>
                                </div>
                                <div className={styles.dates}>
                                    <div className={styles.calendrier}>
                                        <div className={styles.choix}>
                                            <p>Choisir une date</p>
                                        </div>
                                        <DayPicker className={styles.DayPicker}
                                            mode="single"
                                            showOutsideDays
                                            selected={dateSelectionnee}
                                            onSelect={choisirDate}
                                        />
                                        <div className={styles.choix}>
                                            <p>Choisir un crenau horaire</p>
                                        </div>
                                        {!dateSelectionnee ? (
                                            <p className={styles.sous_texte_creneaux}>Choisissez d'abord une date</p>
                                        ) : loadingCreneaux ? (
                                            <p className={styles.sous_texte_creneaux}>Chargement...</p>
                                        ) : creneauxDuJour.length === 0 ? (
                                            <p className={styles.sous_texte_creneaux}>Aucun créneau disponible</p>
                                        ) : (
                                            <div className={styles.creneaux_grid_desktop}>
                                                {creneauxDuJour.map((c) => (
                                                    <div
                                                        key={c.id}
                                                        className={`${styles.creneau_pill_desktop} ${creneauSelectionne?.id === c.id ? styles.creneau_pill_actif : ''}`}
                                                        onClick={() => choisirCreneau(c)}
                                                    >
                                                        {c.heureDebut} - {c.heureFin}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className={styles.phrase_comment_ca_marche} ref={refCommentCaMarche}>Comment ça marche ?</p>
                            <div className={styles.comment_ca_marche}>

                                <div className={styles.informations_comment_ca_marche}>
                                    <FaRegCalendarAlt size={60} color='green' />
                                    <Bs1CircleFill size={24} color='green' />

                                    <div className={styles.informations_supp}>
                                        <p className={styles.libel}>Reserver</p>
                                        <p className={styles.description}>choisissez entierement ou depot,<br /> remplissez vos informations et selectionnez une date</p>
                                    </div>
                                    <FaArrowRight className={styles.fleche} />
                                    <FaWhatsapp size={60} color='green' />
                                    <Bs2CircleFill size={24} color='green' />

                                    <div className={styles.informations_supp}>
                                        <p className={styles.libel}>Nous confirmons</p>
                                        <p className={styles.description}>Nous vous contacterons par whatsapp <br /> pour confirmer votre rendez-vous</p>
                                    </div>
                                    <FaArrowRight className={styles.fleche} />
                                    <FiPackage size={60} color='green' />
                                    <Bs3CircleFill size={24} color='green' />

                                    <div className={styles.informations_supp}>
                                        <p className={styles.libel}>Nous recuperons <br /> /Vous deposez</p>
                                        <p className={styles.description}>Nous venons chez vous ou vous deposez votre colis</p>
                                    </div>
                                    <FaArrowRight className={styles.fleche} />
                                    <FaCheckCircle size={60} color='green' />
                                    <Bs4CircleFill size={24} color='green' />
                                    <div className={styles.informations_supp}>
                                        <p className={styles.libel}>Livré</p>
                                        <p className={styles.description}>Votre colis est livré en toute securite a destination</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    )}
                    {/* ─── MOBILE ─── */}
                    {!isDesktop && !isTablet && (
                        <div className={styles.mobile}>

                            {/* Header */}
                            <div className={styles.header_mobile}>
                                <img className={styles.logo_img_mobile} src={logo} alt="Logo GVIP" />
                                <div className={styles.whatsapp_mobile} onClick={() => allerVers(refContact)} style={{ cursor: 'pointer' }}>
                                    <FaWhatsapp color='#fff' size={16} />
                                    <p className={styles.numero_mobile}>+225 07 49 49 49 49</p>
                                </div>
                            </div>

                            {/* Hero */}
                            <div className={styles.hero_mobile} ref={refAPropos}>
                                <span className={styles.badge_mobile}>PRISE DE RENDEZ-VOUS</span>
                                <h1 className={styles.titre_hero_mobile}>Réservez votre rendez-vous colis</h1>
                                <p className={styles.sous_titre_mobile}>Planifiez facilement l'enlèvement ou le dépôt de votre colis</p>
                                <div className={styles.pills_mobile}>
                                    <span className={styles.pill}>✓ Rapide</span>
                                    <span className={styles.pill}>✓ Fiable</span>
                                    <span className={styles.pill}>✓ Sécurisé</span>
                                </div>
                            </div>

                            {/* Choix type de colis (nouveau design clair, 4 cartes) */}
                            <div className={`${styles.grille_options_mobile} ${erreurOption ? styles.grille_options_erreur : ''}`}>
                                {OPTIONS_COLIS.map((option) => (
                                    <CarteOption
                                        key={option.id}
                                        option={option}
                                        active={optionSelectionnee === option.id}
                                        onClick={() => choisirOption(option.id)}
                                        enErreur={erreurOption}
                                    />
                                ))}
                            </div>
                            {erreurOption && (
                                <p className={styles.option_erreur_texte}>
                                    Merci de sélectionner un mode de récupération / dépôt ci-dessus.
                                </p>
                            )}

                            {/* Formulaire */}
                            <div className={styles.formulaire_mobile} ref={refRendezVous}>
                                <p className={styles.titre_formulaire_mobile}>Vos informations</p>

                                <div className={styles.section_label}>Coordonnées</div>

                                <div className={styles.champ_mobile}>
                                    <label className={styles.label_mobile}>Nom complet <span className={styles.asterix}>*</span></label>
                                    <div className={styles.champs_mobile}>
                                        <input
                                            className={styles.input_mobile}
                                            type="text"
                                            placeholder="Votre nom complet"
                                            value={formData.nomComplet}
                                            onChange={(e) => majFormulaire('nomComplet', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className={styles.champ_mobile}>
                                    <label className={styles.label_mobile}>Téléphone / WhatsApp <span className={styles.asterix}>*</span></label>
                                    <div className={styles.champs_mobile}>
                                        <SelecteurPaysTelephone
                                            paysActif={paysTelephone}
                                            ouvert={menuPaysOuvert}
                                            onToggle={() => setMenuPaysOuvert((v) => !v)}
                                            onChoisir={choisirPaysTelephone}
                                            wrapperRef={refSelecteurPays}
                                        />
                                        <input
                                            className={styles.input_mobile}
                                            type="text"
                                            placeholder={INDICATIFS_PAYS[paysTelephone].placeholder}
                                            value={formData.telephone}
                                            onChange={(e) => majFormulaire('telephone', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className={styles.champ_mobile}>
                                    <label className={styles.label_mobile}>Email <span className={styles.optionnel}>(optionnel)</span></label>
                                    <div className={styles.champs_mobile}>
                                        <input
                                            className={styles.input_mobile}
                                            type="email"
                                            placeholder="votre@email.com"
                                            value={formData.email}
                                            onChange={(e) => majFormulaire('email', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className={styles.section_label}>Détails du colis</div>

                                <div className={styles.row_double}>
                                    <div className={styles.champ_mobile}>
                                        <label className={styles.label_mobile}>Type <span className={styles.optionnel}>(optionnel)</span></label>
                                        <div className={styles.champs_mobile}>
                                            <input
                                                className={styles.input_mobile}
                                                type="text"
                                                placeholder="Ex: vêtements"
                                                value={formData.typeColis}
                                                onChange={(e) => majFormulaire('typeColis', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.champ_mobile}>
                                        <label className={styles.label_mobile}>Taille <span className={styles.optionnel}>(optionnel)</span></label>
                                        <div className={styles.champs_mobile}>
                                            <input
                                                className={styles.input_mobile}
                                                type="text"
                                                placeholder="Ex: moyen"
                                                value={formData.tailleColis}
                                                onChange={(e) => majFormulaire('tailleColis', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.champ_mobile}>
                                    <label className={styles.label_mobile}>Destination <span className={styles.asterix}>*</span></label>
                                    <div className={styles.champs_mobile}>
                                        <select
                                            className={styles.input_mobile}
                                            value={formData.destination}
                                            onChange={(e) => majFormulaire('destination', e.target.value)}
                                        >
                                            <option value="">Sélectionnez une destination</option>
                                            {OPTIONS_DESTINATION.map((d) => (
                                                <option key={d.code} value={d.label}>
                                                    {d.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.champ_mobile}>
                                    <label className={styles.label_mobile}>Adresse / Ville <span className={styles.asterix}>*</span></label>
                                    <div className={styles.champs_mobile}>
                                        <input
                                            className={styles.input_mobile}
                                            type="text"
                                            placeholder="Votre adresse de collecte"
                                            value={formData.adresse}
                                            onChange={(e) => majFormulaire('adresse', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className={styles.section_label}>Date & horaire</div>

                                <div className={styles.calendrier_mobile}>
                                    <p className={styles.choix_mobile}>Choisir une date</p>
                                    <DayPicker mode="single" showOutsideDays selected={dateSelectionnee} onSelect={choisirDate} />
                                    <p className={styles.choix_mobile}>Choisir un créneau horaire</p>
                                    {!dateSelectionnee ? (
                                        <p className={styles.sous_texte_creneaux}>Choisissez d'abord une date</p>
                                    ) : loadingCreneaux ? (
                                        <p className={styles.sous_texte_creneaux}>Chargement...</p>
                                    ) : creneauxDuJour.length === 0 ? (
                                        <p className={styles.sous_texte_creneaux}>Aucun créneau disponible</p>
                                    ) : (
                                        <div className={styles.creneaux_grid}>
                                            {creneauxDuJour.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className={`${styles.creneau_pill} ${creneauSelectionne?.id === c.id ? styles.creneau_pill_actif : ''}`}
                                                    onClick={() => choisirCreneau(c)}
                                                >
                                                    {c.heureDebut}–{c.heureFin}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.champ_mobile}>
                                    <label className={styles.label_mobile}>Notes <span className={styles.optionnel}>(optionnel)</span></label>
                                    <div className={styles.champs_mobile_textarea}>
                                        <textarea
                                            className={styles.textarea_mobile}
                                            placeholder="Instructions particulières..."
                                            rows={3}
                                            value={formData.notes}
                                            onChange={(e) => majFormulaire('notes', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button className={styles.button_mobile} onClick={envoyerRendezVous} disabled={envoiEnCours}>
                                    <FaCalendarAlt size={15} />
                                    <span>{envoiEnCours ? 'Envoi en cours...' : 'Confirmer le rendez-vous'}</span>
                                </button>
                                <MessageEnvoi message={messageEnvoi} styleClasse={styles.message_envoi_mobile} />
                                <p className={styles.conditions_mobile}>
                                    En confirmant, vous acceptez nos <span className={styles.conditions}>Conditions générales</span>
                                </p>
                            </div>

                            {/* Comment ça marche */}
                            <p className={styles.phrase_comment_mobile} ref={refCommentCaMarche}>Comment ça marche ?</p>
                            <div className={styles.comment_ca_marche_mobile}>
                                {[
                                    { icon: <FaRegCalendarAlt size={26} color='#16a34a' />, num: <Bs1CircleFill size={14} color='#16a34a' />, titre: 'Réserver', desc: 'Choisissez enlèvement ou dépôt, remplissez vos informations et sélectionnez une date.' },
                                    { icon: <FaWhatsapp size={26} color='#16a34a' />, num: <Bs2CircleFill size={14} color='#16a34a' />, titre: 'Nous confirmons', desc: 'Nous vous contacterons par WhatsApp pour confirmer votre rendez-vous.' },
                                    { icon: <FiPackage size={26} color='#16a34a' />, num: <Bs3CircleFill size={14} color='#16a34a' />, titre: 'Récupération / Dépôt', desc: 'Nous venons chez vous ou vous déposez votre colis dans un point GVIP.' },
                                    { icon: <FaCheckCircle size={26} color='#16a34a' />, num: <Bs4CircleFill size={14} color='#16a34a' />, titre: 'Livré', desc: 'Votre colis est livré en toute sécurité à destination.' },
                                ].map((e, i) => (
                                    <div key={i} className={styles.etape_mobile}>
                                        <div className={styles.etape_icone_wrap}>
                                            {e.icon}
                                            <div className={styles.etape_num}>{e.num}</div>
                                        </div>
                                        <div className={styles.etape_texte}>
                                            <p className={styles.libel_mobile}>{e.titre}</p>
                                            <p className={styles.description_mobile}>{e.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    )
}

export default Utilisateur;
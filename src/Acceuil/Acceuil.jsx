import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useMediaQuery } from 'react-responsive';
import { FaArrowRight, FaCalendar, FaClock, FaSearch, FaTag, FaTimes, FaUsers, FaPaperPlane, FaRegCalendarAlt, FaCheckCircle, FaBars, FaInstagram, FaTiktok, FaYoutube, FaWhatsapp, FaBus, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaCloudUploadAlt, FaFileAlt, FaPhoneAlt, FaArrowLeft, FaMapMarkerAlt, FaChevronDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from '../Acceuil/Acceuil.module.css'
import logo_entreprise from '../assets/logo_entreprise.png'
import arrierePlan1 from '../assets/arriere_plan1.png'
import arrierePlan2 from '../assets/arriere_plan2.png'
import arrierePlan3 from '../assets/arriere_plan3.png'
import arrierePlan4 from '../assets/arriere_plan4.png'
import { filtrerTelephone, bloquerSymbolesNombre } from '../utils/champsNumeriques.js'
import { FaMoneyBill, FaShield } from 'react-icons/fa6';
import { CI, FR } from 'country-flag-icons/react/3x2';
// On passe uniquement par les fonctions du fichier Firebase partage,
// sans appeler firebase/database ou firebase/storage directement.
import { connexionAdmin, deconnexionAdmin, envoyerReinitialisationMotDePasse, creerDemandePartenaire, telephoneDejaPartenaire, emailDejaPartenaire, ecouterToutesExpeditions, estDepartAffiche, prochaineDateDepart, libelleFrequence, lireDateExpedition } from '../firebase/firebase';

// images du bandeau de l'accueil : chacune reste 10 secondes entierement visible
// (le temps de lire le texte qu'elle contient), puis le fondu vers la suivante dure
// DUREE_FONDU_MS (a garder egal a la transition .fond_diapo du CSS)
const IMAGES_FOND = [arrierePlan1, arrierePlan2, arrierePlan3, arrierePlan4];
const DUREE_AFFICHAGE_MS = 10000;
const DIAPOS_TEXTE = [
    {
        titre: ['Transporteurs', 'vérifiés'],
        sousTitre: 'Des partenaires de confiance.',
        paragraphe: "Chaque compagnie est vérifiée avant de pouvoir publier ses départs. Vous envoyez vos colis entre la France et la Côte d'Ivoire avec des transporteurs fiables.",
        points: [
            { icone: FaCheckCircle, titre: 'Vérification des transporteurs' },
            { icone: FaCheckCircle, titre: 'Suivi et traçabilité des envois' },
            { icone: FaCheckCircle, titre: 'Livraison en toute sécurité' },
        ],
    },
    {
        titre: ['Départs', 'réguliers'],
        sousTitre: 'Chaque jour, chaque semaine.',
        paragraphe: "Les transporteurs publient leurs départs à des dates précises : départ unique, chaque semaine ou chaque mois. Retrouvez facilement le prochain départ qui correspond à votre trajet.",
        points: [
            { icone: FaCalendar, titre: 'Départs programmés', detail: 'Selon vos besoins' },
            { icone: FaMapMarkerAlt, titre: 'Large réseau', detail: "En France et à l'international" },
            { icone: FaClock, titre: 'Suivi en temps réel', detail: "De l'enlèvement à la livraison" },
        ],
    },
    {
        titre: ['Tarifs', 'transparents'],
        sousTitre: 'Comparez et choisissez.',
        paragraphe: "Chaque départ affiche son tarif au kilo et sa limite de poids avant même de contacter le transporteur. Comparez les offres et choisissez celle qui vous convient.",
        points: [
            { icone: FaSearch, titre: 'Comparez les transporteurs', detail: 'Des prix clairs, des services fiables' },
            { icone: FaCalendar, titre: 'Choisissez votre départ', detail: 'Celui qui vous convient' },
            { icone: FaPhoneAlt, titre: 'Contactez le transporteur', detail: 'Votre choix en toute confiance' },
        ],
    },
];
const DUREE_FONDU_MS = 1200;
const DELAI_DIAPORAMA_MS = DUREE_AFFICHAGE_MS + DUREE_FONDU_MS;

// formulaire "contacter l'expediteur" d'un depart
const ETAT_INITIAL_CONTACT = { nom: '', prenom: '', quantite: '', telephone: '', nature: '' };

// filtres vides du formulaire "Trouvez un depart"
const RECHERCHE_VIDE = { paysDepart: '', villeDepart: '', paysArrivee: '', date: '' };

// "Bouaké " -> "bouake" : recherche de ville sans accents ni majuscules
function normaliser(texte) {
    return String(texte || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// etat initial du formulaire "devenir partenaire" - uniquement transporteurs de colis
const ETAT_INITIAL_PARTENAIRE = {
    nomEntreprise: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
};

// etat initial des fichiers du formulaire "devenir partenaire"
const ETAT_INITIAL_FICHIERS_PARTENAIRE = {
    logo: null,
    preuve: null,
};

// etat initial du formulaire "se connecter"
const ETAT_INITIAL_CONNEXION = {
    email: '',
    motDePasse: '',
};

// CORRECTION : traduction des codes d'erreur Firebase Auth en messages lisibles,
// identique à ce qui existe déjà dans Dashboard.jsx (partenaires).
function traduireErreurConnexion(code) {
    const messages = {
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
    };
    return messages[code] || 'Une erreur est survenue, réessayez.';
}

// messages d'erreur de l'envoi du lien de reinitialisation du mot de passe
function traduireErreurOubli(code) {
    const messages = {
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/too-many-requests': 'Trop de demandes. Réessayez dans quelques minutes.',
        'auth/network-request-failed': 'Problème de connexion internet.',
    };
    return messages[code] || 'Une erreur est survenue, réessayez.';
}

// delai avant de pouvoir renvoyer le lien (en secondes)
const DELAI_RENVOI_S = 30;

// AJOUT : petit composant reutilisable pour une zone de depot de fichier (drag & drop + clic)
function ZoneDepotFichier({ label, description, accept, fichier, onChange }) {
    const [surSurvol, setSurSurvol] = useState(false);
    const [apercu, setApercu] = useState(null);
    const inputRef = useRef(null);

    // genere un apercu image si le fichier depose est une image
    useEffect(() => {
        if (fichier && fichier.type.startsWith('image/')) {
            const url = URL.createObjectURL(fichier);
            setApercu(url);
            return () => URL.revokeObjectURL(url);
        }
        setApercu(null);
    }, [fichier]);

    const gererDepot = (e) => {
        e.preventDefault();
        setSurSurvol(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onChange(f);
    };

    return (
        <div className={styles.champPartenaire}>
            <label>{label}</label>
            <div
                className={`${styles.zoneDepot} ${surSurvol ? styles.zoneDepotActive : ''} ${fichier ? styles.zoneDepotRemplie : ''}`}
                onDragOver={(e) => { e.preventDefault(); setSurSurvol(true); }}
                onDragLeave={() => setSurSurvol(false)}
                onDrop={gererDepot}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    hidden
                    onChange={(e) => { if (e.target.files?.[0]) onChange(e.target.files[0]); }}
                />

                {fichier ? (
                    <div className={styles.zoneDepotApercu}>
                        {apercu ? (
                            <img src={apercu} alt="Aperçu" className={styles.zoneDepotImage} />
                        ) : (
                            <FaFileAlt size={26} color="rgb(39, 123, 48)" />
                        )}
                        <p className={styles.zoneDepotNomFichier}>{fichier.name}</p>
                        <button
                            type="button"
                            className={styles.zoneDepotSupprimer}
                            onClick={(e) => { e.stopPropagation(); onChange(null); }}
                        >
                            <FaTimes size={11} /> Retirer
                        </button>
                    </div>
                ) : (
                    <div className={styles.zoneDepotVide}>
                        <FaCloudUploadAlt size={30} color="rgb(39, 123, 48)" />
                        <p className={styles.zoneDepotTexte}>
                            <strong>Glissez-déposez</strong> ou cliquez pour choisir
                        </p>
                        <p className={styles.zoneDepotHint}>{description}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// drapeau d'un pays de depart / d'arrivee
function DrapeauPays({ pays }) {
    if (pays === 'France') return <FR title="France" className={styles.drapeau_mini} />;
    if (pays === "Côte d'Ivoire") return <CI title="Côte d'Ivoire" className={styles.drapeau_mini} />;
    return null;
}

// "Sam. 10 oct."
function formatDateCarte(date) {
    if (!date) return '';
    const texte = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function formatPrix(n) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function initialesCompagnie(nom) {
    return String(nom || 'G').trim().split(/\s+/).map((m) => m[0]).join('').slice(0, 2).toUpperCase();
}

function Acceuil(){
    const [menuOuvert, setMenuOuvert] = useState(false);

    // breakpoints geres par react-responsive
    const isMobile = useMediaQuery({ maxWidth: 640 });
    const isTablette = useMediaQuery({ minWidth: 641, maxWidth: 1024 });
    const isDesktop = useMediaQuery({ minWidth: 1025 });
    const isMobileOuTablette = isMobile || isTablette;

    // diaporama du bandeau : une image est affichee seulement une fois chargee
    // (on voit un fond neutre, jamais de couleur vive, pendant le chargement)
    const [indexFond, setIndexFond] = useState(0);
    // image qui s'efface pendant le fondu (reste dessous le temps du fondu, puis disparait)
    const [indexPrecedent, setIndexPrecedent] = useState(null);
    const indexFondCourant = useRef(0);
    const [fondsCharges, setFondsCharges] = useState({});
    // passe a l'image (et au texte) numero `cible`
    const allerALaDiapo = useCallback((cible) => {
        const precedent = indexFondCourant.current;
        if (cible === precedent) return;
        indexFondCourant.current = cible;
        setIndexPrecedent(precedent);
        setIndexFond(cible);
        setTimeout(() => setIndexPrecedent(null), DUREE_FONDU_MS);
    }, []);
    const diapoPrecedente = () => allerALaDiapo((indexFond - 1 + IMAGES_FOND.length) % IMAGES_FOND.length);
    const diapoSuivante = () => allerALaDiapo((indexFond + 1) % IMAGES_FOND.length);

    // prechargement des images
    useEffect(() => {
        if (isMobile) return;
        IMAGES_FOND.forEach((src, i) => {
            const img = new Image();
            img.onload = () => setFondsCharges((prec) => ({ ...prec, [i]: true }));
            img.src = src;
        });
    }, [isMobile]);

    // defilement automatique : le compte a rebours repart de zero a chaque changement d'image,
    // y compris quand le visiteur utilise les boutons
    useEffect(() => {
        if (isMobile) return;
        const minuteur = setTimeout(() => allerALaDiapo((indexFond + 1) % IMAGES_FOND.length), DELAI_DIAPORAMA_MS);
        return () => clearTimeout(minuteur);
    }, [isMobile, indexFond, allerALaDiapo]);

    // etats du modal "devenir partenaire"
    const [modalPartenaireOuvert, setModalPartenaireOuvert] = useState(false);
    const [formPartenaire, setFormPartenaire] = useState(ETAT_INITIAL_PARTENAIRE);
    const [fichiersPartenaire, setFichiersPartenaire] = useState(ETAT_INITIAL_FICHIERS_PARTENAIRE);
    const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    const [erreurPartenaire, setErreurPartenaire] = useState('');

    // departs = expeditions "Planifie" a venir ajoutees par les compagnies dans leur espace (temps reel)
    const [departs, setDeparts] = useState([]);
    const [chargementDeparts, setChargementDeparts] = useState(true);
    const [voirTousDeparts, setVoirTousDeparts] = useState(false);
    const [departOuvert, setDepartOuvert] = useState(null);
    // contact de l'expediteur depuis la fenetre de details : null (details) | 'formulaire' | 'numero'
    const [etapeContact, setEtapeContact] = useState(null);
    const [formContact, setFormContact] = useState(ETAT_INITIAL_CONTACT);
    const majChampContact = (champ) => (e) => setFormContact((p) => ({ ...p, [champ]: e.target.value }));
    const fermerDetailsDepart = () => {
        setDepartOuvert(null);
        setEtapeContact(null);
        setFormContact(ETAT_INITIAL_CONTACT);
    };
    const envoyerFormulaireContact = (e) => {
        e.preventDefault();
        setEtapeContact('numero');
    };

    useEffect(() => {
        return ecouterToutesExpeditions(
            (liste) => {
                setDeparts(liste);
                setChargementDeparts(false);
            },
            () => setChargementDeparts(false)
        );
    }, []);

    // filtres du formulaire "Trouvez un depart"
    const [recherche, setRecherche] = useState(RECHERCHE_VIDE);
    const majRecherche = (champ) => (e) => setRecherche((p) => ({ ...p, [champ]: e.target.value }));
    const rechercheActive = Object.values(recherche).some(Boolean);
    // telephone : la suite du formulaire se deroule des qu'on touche "Pays de depart" (et reste ouverte)
    const [suiteFormulaireOuverte, setSuiteFormulaireOuverte] = useState(false);

    // prochains departs : expeditions planifiees a venir, compagnies non suspendues, du plus proche au plus lointain.
    // Avec une date choisie, on prend la prochaine occurrence a partir de cette date.
    const prochainsDeparts = useMemo(() => {
        const aPartirDe = recherche.date ? lireDateExpedition(recherche.date) : new Date();
        const ville = normaliser(recherche.villeDepart);
        return departs
            .filter(estDepartAffiche)
            .filter((d) => !recherche.paysDepart || d.paysDepart === recherche.paysDepart)
            .filter((d) => !recherche.paysArrivee || d.paysArrivee === recherche.paysArrivee)
            .filter((d) => !ville || normaliser(d.villeDepart).includes(ville))
            .map((d) => ({ ...d, prochaine: prochaineDateDepart(d, aPartirDe) }))
            .filter((d) => d.prochaine)
            .sort((a, b) => a.prochaine - b.prochaine || (a.heure || '').localeCompare(b.heure || ''));
    }, [departs, recherche]);
    const nbDepartsApercu = isMobile ? 2 : 3;
    // pendant une recherche, on montre tous les resultats
    const modeTousDeparts = voirTousDeparts || rechercheActive;
    const departsAffiches = modeTousDeparts ? prochainsDeparts : prochainsDeparts.slice(0, nbDepartsApercu);

    // nombre de cartes qui tiennent sur une ligne, recalcule quand la largeur de la liste change
    const [cartesParLigne, setCartesParLigne] = useState(3);
    const observateurListe = useRef(null);
    const elListeDeparts = useRef(null);
    // telephone : carte visible dans le carrousel + a-t-on deja fait defiler (pour cacher l'astuce)
    const [carteActive, setCarteActive] = useState(0);
    const [aDefile, setADefile] = useState(false);
    const surDefilementListe = (e) => {
        const el = e.currentTarget;
        const carte = el.firstElementChild;
        if (!carte) return;
        const ecart = parseFloat(getComputedStyle(el).columnGap) || 12;
        setCarteActive(Math.round(el.scrollLeft / (carte.offsetWidth + ecart)));
        if (el.scrollLeft > 10) setADefile(true);
    };
    const allerALaCarte = (i) => {
        const el = elListeDeparts.current;
        const carte = el?.firstElementChild;
        if (!el || !carte) return;
        const ecart = parseFloat(getComputedStyle(el).columnGap) || 12;
        el.scrollTo({ left: i * (carte.offsetWidth + ecart), behavior: 'smooth' });
    };
    const refListeDeparts = useCallback((el) => {
        elListeDeparts.current = el;
        observateurListe.current?.disconnect();
        if (!el) return;
        observateurListe.current = new ResizeObserver(() => {
            const largeurCarte = el.firstElementChild?.offsetWidth || 450;
            setCartesParLigne(Math.max(1, Math.floor((el.clientWidth + 12) / (largeurCarte + 12))));
        });
        observateurListe.current.observe(el);
    }, []);
    // au-dela de 2 lignes (ou sur telephone), les cartes defilent horizontalement ; sinon elles passent simplement a la ligne
    const listeEnDefilement = modeTousDeparts && (isMobile || departsAffiches.length > 2 * cartesParLigne);

    // etats du modal "se connecter"
    const [modalConnexionOuvert, setModalConnexionOuvert] = useState(false);
    const [formConnexion, setFormConnexion] = useState(ETAT_INITIAL_CONNEXION);
    const [motDePasseVisible, setMotDePasseVisible] = useState(false);
    const [erreurConnexion, setErreurConnexion] = useState('');
    const [connexionEnCours, setConnexionEnCours] = useState(false);
    // "mot de passe oublie" : meme fenetre, autre ecran
    const [modeOubli, setModeOubli] = useState(false);
    const [oubliEnCours, setOubliEnCours] = useState(false);
    const [oubliEnvoye, setOubliEnvoye] = useState(false);
    const [erreurOubli, setErreurOubli] = useState('');
    const [delaiRenvoi, setDelaiRenvoi] = useState(0);
    useEffect(() => {
        if (delaiRenvoi <= 0) return;
        const minuteur = setTimeout(() => setDelaiRenvoi((d) => d - 1), 1000);
        return () => clearTimeout(minuteur);
    }, [delaiRenvoi]);

    // fait defiler la page en douceur jusqu'a la section demandee et ferme le menu mobile
    const scrollVers = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setMenuOuvert(false);
    };

    // ouvre le modal "devenir partenaire" et ferme le menu mobile si besoin
    const ouvrirModalPartenaire = () => {
        setModalPartenaireOuvert(true);
        setMenuOuvert(false);
    };

    // ferme le modal et remet le formulaire a zero
    const fermerModalPartenaire = () => {
        setModalPartenaireOuvert(false);
        setFormPartenaire(ETAT_INITIAL_PARTENAIRE);
        setFichiersPartenaire(ETAT_INITIAL_FICHIERS_PARTENAIRE);
        setDemandeEnvoyee(false);
        setErreurPartenaire('');
        setEnvoiEnCours(false);
    };

    const majChampPartenaire = (champ, valeur) => {
        setFormPartenaire((precedent) => ({ ...precedent, [champ]: valeur }));
        setErreurPartenaire('');
    };

    // CORRECTION : enregistrement reel dans la Realtime Database (noeud
    // "demandesPartenaires") + upload du logo et de la preuve d'activite
    // dans Firebase Storage. Une Cloud Function (notifierNouvelleDemandePartenaire)
    // se declenche automatiquement sur ce push() et envoie l'email de
    // notification au proprietaire du site, avec les liens vers les documents.
    const envoyerDemandePartenaire = async (e) => {
        e.preventDefault();
        setErreurPartenaire('');

        if (!fichiersPartenaire.logo || !fichiersPartenaire.preuve) {
            setErreurPartenaire('Merci de fournir le logo et la preuve d\'activité.');
            return;
        }

        setEnvoiEnCours(true);

        try {
            // un email = un seul partenaire
            if (await emailDejaPartenaire(formPartenaire.email)) {
                setErreurPartenaire('Cette adresse email est déjà utilisée par un partenaire GVIP. Si c\'est la vôtre, connectez-vous à votre espace partenaire.');
                return;
            }
            // un numero = un seul partenaire
            if (await telephoneDejaPartenaire(formPartenaire.telephone)) {
                setErreurPartenaire('Ce numéro de téléphone est déjà utilisé par un partenaire GVIP. Si c\'est le vôtre, connectez-vous à votre espace partenaire.');
                return;
            }
            await creerDemandePartenaire(formPartenaire, fichiersPartenaire);
            setDemandeEnvoyee(true);
        } catch (err) {
            console.error('Erreur lors de l\'envoi de la demande de partenariat :', err);
            setErreurPartenaire('Une erreur est survenue, veuillez réessayer.');
        } finally {
            setEnvoiEnCours(false);
        }
    };

    // Arriver sur l'accueil ferme toute session partenaire restée ouverte
    // (ex. retour avec les flèches du navigateur) : l'espace partenaire
    // redemandera alors le mot de passe.
    useEffect(() => {
        deconnexionAdmin().catch(() => {});
    }, []);

    // ouvre le modal "se connecter" et ferme le menu mobile si besoin
    const ouvrirModalConnexion = () => {
        setModalConnexionOuvert(true);
        setMenuOuvert(false);
    };

    // ferme le modal et remet le formulaire a zero
    const fermerModalConnexion = () => {
        setModalConnexionOuvert(false);
        setFormConnexion(ETAT_INITIAL_CONNEXION);
        setErreurConnexion('');
        setMotDePasseVisible(false);
        setConnexionEnCours(false);
        setModeOubli(false);
        setOubliEnCours(false);
        setOubliEnvoye(false);
        setErreurOubli('');
        setDelaiRenvoi(0);
    };

    // retour de l'ecran "mot de passe oublie" vers la connexion
    const retourConnexion = () => {
        setModeOubli(false);
        setOubliEnvoye(false);
        setErreurOubli('');
        setDelaiRenvoi(0);
    };

    // envoie le lien de reinitialisation. Le message de succes ne dit pas si le compte existe
    // (pour ne pas reveler quelles adresses sont inscrites).
    const envoyerOubli = async (e) => {
        e?.preventDefault();
        setErreurOubli('');
        setOubliEnCours(true);
        try {
            await envoyerReinitialisationMotDePasse(formConnexion.email.trim());
            setOubliEnvoye(true);
            setDelaiRenvoi(DELAI_RENVOI_S);
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                // meme message qu'un succes : on ne revele pas si l'adresse existe
                setOubliEnvoye(true);
                setDelaiRenvoi(DELAI_RENVOI_S);
            } else {
                console.error('Erreur mot de passe oublie :', err);
                setErreurOubli(traduireErreurOubli(err.code));
            }
        } finally {
            setOubliEnCours(false);
        }
    };

    const majChampConnexion = (champ, valeur) => {
        setFormConnexion((precedent) => ({ ...precedent, [champ]: valeur }));
        setErreurConnexion('');
    };

    // CORRECTION : appel réel à Firebase Auth (email.trim() / motDePasse.trim()
    // pour éviter tout espace parasite), au lieu de la simulation par setTimeout.
    const envoyerConnexion = async (e) => {
        e.preventDefault();
        setErreurConnexion('');
        setConnexionEnCours(true);

        try {
            await connexionAdmin(formConnexion.email.trim(), formConnexion.motDePasse.trim());
            // Connexion réussie : on redirige vers l'espace partenaire.
            // ⚠️ Adapte ce chemin si ta route vers Dashboard.jsx (dossier Partenaire)
            // n'est pas exactement "/Partenaire" dans ton App.jsx / routeur.
            window.location.href = '/espace_partenaire';
        } catch (err) {
            console.error('Erreur de connexion :', err);
            setErreurConnexion(traduireErreurConnexion(err.code));
        } finally {
            setConnexionEnCours(false);
        }
    };

    return(
<>

<div className={styles.corps}>

{/*le header de la page */}

        <div className={styles.header}>

            {/*le logo de l'entreprise */}

            <div className={styles.logo_entreprise}>
<img src={logo_entreprise} alt="logo de l'entreprise" />
            </div>

            {/*les onglets de navigations de la page - caches sur mobile/tablette, remplaces par le burger */}
            {isDesktop && (
            <div className={styles.navigation}>
            <div className={styles.acceuil} onClick={() => scrollVers('acceuil')}>
<p>Accueil</p>
            </div>
            <div className={styles.trouver_depart} onClick={() => scrollVers('trouver-depart')}>
<p>Trouver un départ</p>
            </div>
            <div className={styles.nos_transport} onClick={() => scrollVers('nos-transport')}>
<p>Nos transporteurs</p>
            </div>
            <div className={styles.comment_ca_marche} onClick={() => scrollVers('comment-ca-marche')}>
<p>Comment ça marche</p>
            </div>
            <div className={styles.a_propos} onClick={() => scrollVers('a-propos')}>
<p>A propos</p>
            </div>
            <div className={styles.contact} onClick={() => scrollVers('contact')}>
<p>Contact</p>
            </div>
        </div>
            )}

        {/*message pour devemir partenaire */}

        <div className={styles.demande_partenariat}>
            <FaUsers size={isMobile ? 26 : 50} color='rgb(39, 123, 48)'/>
            <div className={styles.descritpion}>
<p><strong >Vous transportez aussi des colis ?</strong></p>
<p>Alors devenez partenaire !</p>
            </div>
        </div>

        {/*les boutons se connecter / devenir partenaire - visibles seulement en desktop */}
        {isDesktop && (
        <div className={styles.bouton_header}>
<div className={styles.se_connecter}>
    <button type='submit' onClick={ouvrirModalConnexion}>Se connecter</button>
</div>
<div className={styles.devenir_partenaire}>
    <button type='submit' onClick={ouvrirModalPartenaire}> Devenir partenaire</button>
</div>
        </div>
        )}

        {/* bouton burger - uniquement mobile/tablette */}
        {isMobileOuTablette && (
        <button
            type="button"
            className={styles.bouton_burger}
            onClick={() => setMenuOuvert(!menuOuvert)}
            aria-label="Ouvrir le menu"
        >
            {menuOuvert ? <FaTimes size={22} color="rgb(39,123,48)"/> : <FaBars size={22} color="rgb(39,123,48)"/>}
        </button>
        )}

        {/* menu deroulant mobile/tablette - affiche seulement si ouvert */}
        {isMobileOuTablette && menuOuvert && (
            <div className={styles.navigation_ouverte}>
            <div className={styles.acceuil} onClick={() => scrollVers('acceuil')}>
<p>Accueil</p>
            </div>
            <div className={styles.trouver_depart} onClick={() => scrollVers('trouver-depart')}>
<p>Trouver un départ</p>
            </div>
            <div className={styles.nos_transport} onClick={() => scrollVers('nos-transport')}>
<p>Nos transporteurs</p>
            </div>
            <div className={styles.comment_ca_marche} onClick={() => scrollVers('comment-ca-marche')}>
<p>Comment ça marche</p>
            </div>
            <div className={styles.a_propos} onClick={() => scrollVers('a-propos')}>
<p>A propos</p>
            </div>
            <div className={styles.contact} onClick={() => scrollVers('contact')}>
<p>Contact</p>
            </div>

            <div className={styles.bouton_header_mobile}>
                <div className={styles.se_connecter}>
                    <button type='submit' onClick={ouvrirModalConnexion}>Se connecter</button>
                </div>
                <div className={styles.devenir_partenaire}>
                    <button type='submit' onClick={ouvrirModalPartenaire}>Devenir partenaire</button>
                </div>
            </div>
        </div>
        )}

        </div>

        <div className={styles.body}>

            <div className={styles.acceuil_body} id="acceuil">
                <div className={styles.description}>
                  <div className={styles.diapos_texte}>
                    <div className={`${styles.texte_diapo} ${isMobile || indexFond === 0 ? styles.texte_diapo_actif : ''}`}>
                    <div className={styles.description1}>
<p>Trouvez le meilleur<br />départ pour <span className={styles.ecriture_verte}>vos colis</span></p>

                    </div>
                    <div className={styles.description2}>
<p>GVIP Colis est la plateforme qui centralise les départs</p>
<p>proposés par les transporteurs fiables.</p>
<p>Comparez, choisissez et expédiez en toute confiance.</p>
{!isMobile && (
<div className={styles.description3}>

<div className={styles.info1}>
<div className={styles.icone}>
<FaShield size={30} color="green"/>
</div>
<div className={styles.mini_description}>
<p style={{color:"green"}}><strong>Transporteurs vérifiés</strong></p>
<p style={{fontWeight:700,fontSize:13}}> Des partenaires de confiance</p>
</div>
</div>

<div className={styles.info1}>
<div className={styles.icone}>
< FaCalendar size={30} color="green"/>
</div>
<div className={styles.mini_description}>
<p style={{color:"green"}}><strong>Départs réguliers</strong></p>
<p style={{fontWeight:700,fontSize:13}}>Chaque jour, chaque semaine</p>
</div>
</div>

<div className={styles.info1}>
<div className={styles.icone}>
<FaTag size={30} style={{color:"green"}}/>
</div>
<div className={styles.mini_description}>
<p style={{color:"green"}}><strong>Tarifs transparents</strong></p>
<p style={{fontWeight:700,fontSize:13}}>Comparez et choisissez</p>
</div>
</div>

</div>
)}
                    </div>

                    </div>
                    {!isMobile && DIAPOS_TEXTE.map((d, k) => (
                        <div
                            key={d.titre[0]}
                            className={`${styles.texte_diapo} ${indexFond === k + 1 ? styles.texte_diapo_actif : ''}`}
                            aria-hidden={indexFond !== k + 1}
                        >
                            <p className={styles.diapo_titre}>{d.titre[0]}<br /><span className={styles.ecriture_verte}>{d.titre[1]}</span></p>
                            <p className={styles.diapo_sous_titre}>{d.sousTitre}</p>
                            <p className={styles.diapo_paragraphe}>{d.paragraphe}</p>
                            <div className={`${styles.description3} ${styles.diapo_cartes}`}>
                                {d.points.map((pt) => {
                                    const Icone = pt.icone;
                                    return (
                                        <div key={pt.titre} className={styles.info1}>
                                            <div className={styles.icone}>
                                                <Icone size={30} color="green" />
                                            </div>
                                            <div className={styles.mini_description}>
                                                <p style={{ color: 'green' }}><strong>{pt.titre}</strong></p>
                                                {pt.detail && <p style={{ fontWeight: 700, fontSize: 13 }}>{pt.detail}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                  </div>
                </div>
                {!isMobile && (
                <div className={styles.image_arriere1}>
                    {IMAGES_FOND.map((src, i) => (
                        <div key={src} className={`${styles.fond_diapo} ${fondsCharges[i] && i === indexFond ? styles.fond_diapo_actif : fondsCharges[i] && i === indexPrecedent ? styles.fond_diapo_precedent : ''}`}>
                            <div className={`${styles.fond_diapo_cadre} ${i > 0 ? styles.fond_diapo_fondu : ''}`}>
                                <img src={src} alt="" className={styles.fond_diapo_img} />
                            </div>
                        </div>
                    ))}
                </div>
                )}
                {!isMobile && (
                <div className={styles.diapo_controles}>
                    <button type="button" className={styles.diapo_fleche} onClick={diapoPrecedente} aria-label="Image précédente">
                        <FaChevronLeft size={13} />
                    </button>
                    <div className={styles.diapo_nav_points}>
                        {IMAGES_FOND.map((src, i) => (
                            <button
                                key={src}
                                type="button"
                                className={`${styles.diapo_nav_point} ${i === indexFond ? styles.diapo_nav_point_actif : ''}`}
                                onClick={() => allerALaDiapo(i)}
                                aria-label={`Aller à l'image ${i + 1} sur ${IMAGES_FOND.length}`}
                                aria-current={i === indexFond}
                            >
                                {i === indexFond && (
                                    <span key={indexFond} className={styles.diapo_progression} style={{ animationDuration: `${DELAI_DIAPORAMA_MS}ms` }} />
                                )}
                            </button>
                        ))}
                    </div>
                    <button type="button" className={styles.diapo_fleche} onClick={diapoSuivante} aria-label="Image suivante">
                        <FaChevronRight size={13} />
                    </button>
                </div>
                )}
            </div>
            <div className={styles.trouver_depart_body} id="trouver-depart">
<div className={styles.titre_recherche}>
<p style={{fontSize: isMobile ? 20 : 25}}> <strong>Trouvez un départ</strong></p>
{isMobile && (
    <button
        type="button"
        className={`${styles.bouton_replier} ${suiteFormulaireOuverte ? styles.bouton_replier_ouvert : ''}`}
        onClick={() => setSuiteFormulaireOuverte((ouvert) => !ouvert)}
        aria-expanded={suiteFormulaireOuverte}
    >
        {suiteFormulaireOuverte ? 'Replier' : 'Déplier'} <FaChevronDown size={12} />
    </button>
)}
</div>
<div className={styles.formulaire}>
    <div className={styles.champs}>
        <p>Pays de départ</p>
        <select value={recherche.paysDepart} onChange={majRecherche('paysDepart')} onFocus={() => setSuiteFormulaireOuverte(true)} onClick={() => setSuiteFormulaireOuverte(true)}>
        <option value="">Pays de départ</option>
        <option value="Côte d'Ivoire">Côte d'Ivoire</option>
        <option value="France">France</option>
      </select>
</div>
{/* sur telephone, le reste du formulaire se deroule quand un champ est rempli (ex. le pays de depart) */}
<div className={`${styles.suite_formulaire} ${!isMobile || suiteFormulaireOuverte ? styles.suite_ouverte : ''}`}>
<div className={styles.suite_formulaire_interieur}>
<div className={styles.champs}>
      <p>Ville de départ</p>

      
      <input
        type="text"
        name="ville_depart"
        value={recherche.villeDepart}
        onChange={majRecherche('villeDepart')}
        placeholder="Ex : Abidjan, Yamoussoukro..."
        autoComplete="off"
      />
</div>
      <div className={styles.champs}>
      <p>Pays de destination</p>

      <select value={recherche.paysArrivee} onChange={majRecherche('paysArrivee')}>
        <option value="">Pays de destination</option>
        <option value="Côte d'Ivoire">Côte d'Ivoire</option>
        <option value="France">France</option>
      </select>
</div>
      <div className={styles.champs}>
      <p >Date de départ</p>

      <input
        type="date"
        name="date_depart"
        value={recherche.date}
        onChange={majRecherche('date')}
        min={new Date().toISOString().split('T')[0]}
      />
</div>
</div>
</div>
      
    </div>

</div>
            </div>
            <div className={styles.depart_recent_body} id="nos-transport">
                <div className={styles.depart_recent_entete}>
                <p style={{fontSize: isMobile ? 20 : 30,fontWeight:800}}>Prochains départs</p>
                {rechercheActive ? (
                <button type='button' className={styles.lien_voir_tout} onClick={() => setRecherche(RECHERCHE_VIDE)}>
                    Effacer la recherche ({prochainsDeparts.length} résultat{prochainsDeparts.length > 1 ? 's' : ''}) <FaTimes size={12}/>
                </button>
                ) : prochainsDeparts.length > nbDepartsApercu && (
                <button type='button' className={styles.lien_voir_tout} onClick={() => setVoirTousDeparts((v) => !v)}>
                    {voirTousDeparts ? 'Voir moins' : `Voir tous les départs (${prochainsDeparts.length})`} <FaArrowRight size={13}/>
                </button>
                )}
                </div>
                {chargementDeparts ? (
                    <p style={{ color: '#6b7280' }}>Chargement des départs...</p>
                ) : prochainsDeparts.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>{rechercheActive
                        ? 'Aucun départ ne correspond à votre recherche. Essayez une autre ville ou une autre date.'
                        : 'Aucun départ programmé pour le moment. Revenez bientôt !'}</p>
                ) : (
                <>
                <div ref={refListeDeparts} onScroll={isMobile ? surDefilementListe : undefined} className={`${styles.container_des_compagnies} ${listeEnDefilement ? styles.grille_deux_lignes : modeTousDeparts ? styles.cartes_a_la_ligne : ''}`}>
                {departsAffiches.map((d) => (
                <div key={d.id} className={styles.compagnies}>
                    <div className={`${styles.info_compagnie1} ${d.paysDepart === "Côte d'Ivoire" ? styles.fond_cote_ivoire : ''}`}>
<div className={styles.partie1}>
<div className={styles.information_sur_depart}>
    <p>Départ confirmé</p>
</div>
<p><strong>{formatDateCarte(d.prochaine)}</strong> </p>
</div>
<div className={styles.partie2}>

<p><DrapeauPays pays={d.paysDepart} />       {d.paysDepart || d.villeDepart}</p>
<FaArrowRight/>
<p><DrapeauPays pays={d.paysArrivee} />        {d.paysArrivee || d.villeArrivee}</p>

</div>
<div className={styles.infos_depart}>
<div className={styles.reference}>
    <p><FaClock/>     Heure</p>
    <p><FaCalendar/>     Fréquence</p>
    <p><FaClock/>     Limite</p>
    <p><FaMoneyBill/>     Tarif</p>
</div>
<div className={styles.reference}>
<p>{d.heure || '—'}</p>
    <p>{libelleFrequence(d)}</p>
    <p>{d.limiteKg ? `${d.limiteKg} KG` : '—'}</p>
    <p>{d.tarifParKilo ? `${formatPrix(d.tarifParKilo)} €/kg` : '—'}</p>
</div>
</div>

                    </div>
                    <div className={styles.info_compagnie2}>
<div className={styles.image_nom_des_compagnies}>

{d.logoUrl ? (
<img src={d.logoUrl} alt={d.nomCompagnie || 'logo'} className={styles.images_compagines} style={{ objectFit: 'cover', backgroundColor: 'white' }} />
) : (
<div className={styles.images_compagines} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
{initialesCompagnie(d.nomCompagnie)}
</div>
)}
<div className={styles.nom_avis_compagnies}>
<p><strong>{d.nomCompagnie || 'Compagnie GVIP'}</strong></p>
<p>{d.villeDepart} → {d.villeArrivee}</p>
</div>
</div>
<div className={styles.voir_details}>
<button type='button' className={styles.bouton_voir_detail} onClick={() => setDepartOuvert(d)}>Voir les détails</button>
</div>
</div>

                    </div>
                ))}
                </div>
                {isMobile && departsAffiches.length > 1 && (
                <div className={styles.indicateur_defilement}>
                    {departsAffiches.length <= 7 ? (
                    <div className={styles.points_defilement}>
                        {departsAffiches.map((d, i) => (
                            <button
                                key={d.id}
                                type="button"
                                className={`${styles.point_defilement} ${i === carteActive ? styles.point_defilement_actif : ''}`}
                                onClick={() => allerALaCarte(i)}
                                aria-label={`Voir le départ ${i + 1} sur ${departsAffiches.length}`}
                            />
                        ))}
                    </div>
                    ) : (
                    <p className={styles.compteur_defilement}>{Math.min(carteActive + 1, departsAffiches.length)} / {departsAffiches.length}</p>
                    )}
                    {!aDefile && (
                    <p className={styles.astuce_defilement}>Glissez pour voir les autres départs <FaArrowRight /></p>
                    )}
                </div>
                )}
                </>
                )}

            </div>
            <div className={styles.comment_ca_marche_body} id="comment-ca-marche">
<div className={styles.commentCaMarcheIntro}>
    <p className={styles.commentCaMarcheTitre}>Comment ça marche ?</p>
    <p className={styles.commentCaMarcheSousTitre}>Expédier votre colis en 4 étapes simples</p>
</div>
<div className={styles.listeEtapes}>
<div className={styles.etape}>
      <div className={styles.etapeIconeConteneur}>
        <FaSearch className={styles.etapeIcone}/>
        <p className={styles.etapeNumero}>1</p>
      </div>
      <div className={styles.etapeContenu}>
        <p className={styles.etapeTitre}>Recherchez</p>
        <p className={styles.etapeTexte}>Trouvez un départ selon votre destination et vos besoins</p>
      </div>
    </div>
<FaArrowRight className={styles.flecheEtape} style={isMobile ? {transform:'rotate(90deg)'} : {}}/>
<div className={styles.etape}>
      <div className={styles.etapeIconeConteneur}>
        <p className={styles.etapeNumero}>2</p>
        <FaRegCalendarAlt className={styles.etapeIcone} />
      </div>
      <div className={styles.etapeContenu}>
        <p className={styles.etapeTitre}>Choisissez</p>
        <p className={styles.etapeTexte}>Sélectionnez le transporteur et le départ qui vous conviennent</p>
      </div>
    </div>

    <FaArrowRight className={styles.flecheEtape} style={isMobile ? {transform:'rotate(90deg)'} : {}}/>
    <div className={styles.etape}>
      <div className={styles.etapeIconeConteneur}>
        <p className={styles.etapeNumero}>3</p>
        <FaPaperPlane className={styles.etapeIcone} />
      </div>
      <div className={styles.etapeContenu}>
        <p className={styles.etapeTitre}>Envoyez votre demande</p>
        <p className={styles.etapeTexte}>Remplissez le formulaire et envoyez votre demande</p>
      </div>
    </div>

<FaArrowRight className={styles.flecheEtape} style={isMobile ? {transform:'rotate(90deg)'} : {}}/>

    <div className={styles.etape}>
      <div className={styles.etapeIconeConteneur}>
        <p className={styles.etapeNumero}>4</p>
        <FaCheckCircle className={styles.etapeIcone} />
      </div>
      <div className={styles.etapeContenu}>
        <p className={styles.etapeTitre}>Confirmez et expédiez</p>
        <p className={styles.etapeTexte}>Le transporteur vous contacte et récupère votre colis</p>
      </div>
    </div>
</div>
            </div>

        </div>
        <div className={styles.footer}>
<div className={styles.footer_partie1} id="a-propos">
    <div className={styles.image_entreprise}>

    </div>
<p>GVIP Colis centralise les départs de colis proposés par des transporteurs fiables pour vous offrir la meilleure expérience d'expédition.</p>
<FR title="Côte d'Ivoire" className={styles.drapeau_mini} style={{marginRight:10}}></FR>
<CI title="Côte d'Ivoire" className={styles.drapeau_mini}></CI>  

</div>
<div className={styles.footer_partie2}>
    <p className={styles.titre_footer}><strong>Navigation</strong></p>
    <p>
<button type='button' className={styles.lien_footer} onClick={() => scrollVers('acceuil')}>Accueil</button><br />
<button type='button' className={styles.lien_footer} onClick={() => scrollVers('trouver-depart')}>Trouver un départ</button><br />
<button type='button' className={styles.lien_footer} onClick={() => scrollVers('nos-transport')}>Nos transporteurs</button><br />
<button type='button' className={styles.lien_footer} onClick={() => scrollVers('comment-ca-marche')}>Comment ça marche</button><br />
<button type='button' className={styles.lien_footer} onClick={() => scrollVers('a-propos')}>A propos</button><br />
<button type='button' className={styles.lien_footer} onClick={() => scrollVers('contact')}>Contact</button></p>
</div>
<div className={styles.footer_partie3}>
    <p className={styles.titre_footer}><strong>Espace partenaire</strong></p>
    <p>
<button type='button' className={styles.lien_footer} onClick={ouvrirModalConnexion}>Se connecter</button><br />
<button type='button' className={styles.lien_footer} onClick={ouvrirModalPartenaire}>Devenir partenaire</button><br />
<a className={styles.lien_footer} href="/espace_partenaire">Publier un départ</a><br />
<a className={styles.lien_footer} href="/espace_partenaire">Tableau de bord</a></p>
</div>
<div className={styles.footer_partie4}>
<p className={styles.titre_footer}><strong>Informations</strong></p>
{/* TODO : pages CGV / confidentialite / mentions legales / FAQ a creer */}
<p>Conditions générales (CGV)<br />
Politique de confidentialité<br />
Mentions légales<br />
FAQ<br />
<a className={styles.lien_footer} href="mailto:contact@gvipcolis.com">Nous contacter</a></p>
</div>
<div className={styles.footer_partie5} id="contact">
    <p className={styles.titre_footer}><strong>Suivez-nous</strong></p>
<p><FaInstagram/> <FaTiktok/> <FaYoutube/> <FaWhatsapp/> <br />

Contact<br />
<a className={styles.lien_footer} href="mailto:contact@gvipcolis.com">contact@gvipcolis.com</a><br />
<a className={styles.lien_footer} href="tel:+33758145546">+33 7 58 14 55 46</a><br />
Lun - Ven : 9h00 - 18h00</p>
</div>
        </div>

{/* modal "details d'un depart" */}
{departOuvert && (
    <div className={styles.overlayPartenaire} onClick={fermerDetailsDepart}>
        <div className={styles.fenetrePartenaire} onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
            <div className={styles.entetePartenaire}>
                <p className={styles.titrePartenaire}>{departOuvert.nomCompagnie || 'Départ'}</p>
                <button
                    type="button"
                    className={styles.boutonFermerPartenaire}
                    onClick={fermerDetailsDepart}
                    aria-label="Fermer"
                >
                    <FaTimes size={18} />
                </button>
            </div>
            {etapeContact === null && (
            <div className={styles.corpsFormulairePartenaire}>
                {(departOuvert.logoUrl || departOuvert.descriptionCompagnie) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
                    {departOuvert.logoUrl && <img src={departOuvert.logoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />}
                    {departOuvert.descriptionCompagnie && <p style={{ margin: 0, fontSize: 13, color: '#4b5563' }}>{departOuvert.descriptionCompagnie}</p>}
                </div>
                )}
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, margin: 0 }}>
                    <DrapeauPays pays={departOuvert.paysDepart} /> {departOuvert.villeDepart}
                    <FaArrowRight size={13} />
                    <DrapeauPays pays={departOuvert.paysArrivee} /> {departOuvert.villeArrivee}
                </p>
                {[
                    ['Prochain départ', `${formatDateCarte(departOuvert.prochaine)}${departOuvert.heure ? ` à ${departOuvert.heure}` : ''}`],
                    ['Fréquence', libelleFrequence(departOuvert)],
                    ['Limite par client', departOuvert.limiteKg ? `${departOuvert.limiteKg} kg` : '—'],
                    ['Tarif', departOuvert.tarifParKilo ? `${formatPrix(departOuvert.tarifParKilo)} € par kg` : '—'],
                    ...(departOuvert.notes ? [['À savoir', departOuvert.notes]] : []),
                ].map(([label, valeur]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <strong style={{ textAlign: 'right' }}>{valeur}</strong>
                    </div>
                ))}
                <button type="button" className={styles.boutonPrincipalPartenaire} style={{ margin: '6px 0 0', width: '100%', justifyContent: 'center' }} onClick={() => setEtapeContact('formulaire')}>
                    <FaPhoneAlt size={13} /> Contacter l'expéditeur
                </button>
            </div>
            )}

            {etapeContact === 'formulaire' && (
            <form className={styles.corpsFormulairePartenaire} onSubmit={envoyerFormulaireContact}>
                <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>
                    Remplissez le formulaire pour pouvoir rentrer en contact avec l'expéditeur.
                </p>
                <div className={styles.grilleChampsPartenaire}>
                    <div className={styles.champPartenaire}>
                        <label>Nom</label>
                        <input type="text" required value={formContact.nom} onChange={majChampContact('nom')} placeholder="Ex : Kouassi" />
                    </div>
                    <div className={styles.champPartenaire}>
                        <label>Prénom</label>
                        <input type="text" required value={formContact.prenom} onChange={majChampContact('prenom')} placeholder="Ex : Jean" />
                    </div>
                    <div className={styles.champPartenaire}>
                        <label>Quantité (kg)</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            onKeyDown={bloquerSymbolesNombre}
                            required
                            min="0.1"
                            step="0.1"
                            max={departOuvert.limiteKg || undefined}
                            value={formContact.quantite}
                            onChange={majChampContact('quantite')}
                            placeholder={departOuvert.limiteKg ? `Max ${departOuvert.limiteKg} kg` : 'Ex : 10'}
                        />
                    </div>
                    <div className={styles.champPartenaire}>
                        <label>Numéro de téléphone</label>
                        <input type="tel" inputMode="tel" required value={formContact.telephone} onChange={(e) => setFormContact((p) => ({ ...p, telephone: filtrerTelephone(e.target.value) }))} placeholder="+225 07 00 00 00 00" />
                    </div>
                    <div className={`${styles.champPartenaire} ${styles.champPleineLargeurPartenaire}`}>
                        <label>Nature du colis</label>
                        <input type="text" required value={formContact.nature} onChange={majChampContact('nature')} placeholder="Ex : vêtements, documents, produits alimentaires..." />
                    </div>
                </div>
                <div className={styles.piedFormulairePartenaire}>
                    <button type="button" className={styles.boutonSecondairePartenaire} onClick={() => setEtapeContact(null)}>Retour</button>
                    <button type="submit" className={styles.boutonPrincipalPartenaire}>Afficher le numéro</button>
                </div>
            </form>
            )}

            {etapeContact === 'numero' && (
            <div className={styles.corpsFormulairePartenaire} style={{ alignItems: 'center', textAlign: 'center' }}>
                {departOuvert.telephoneCompagnie ? (
                <>
                    <FaCheckCircle size={44} color="rgb(39, 123, 48)" />
                    <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>
                        Merci {formContact.prenom} ! Vous pouvez contacter {departOuvert.nomCompagnie || "l'expéditeur"} au :
                    </p>
                    <a href={`tel:${departOuvert.telephoneCompagnie.replace(/\s/g, '')}`} style={{ fontSize: 24, fontWeight: 800, color: 'rgb(39, 123, 48)', textDecoration: 'none' }}>
                        {departOuvert.telephoneCompagnie}
                    </a>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <a className={styles.boutonSecondairePartenaire} style={{ textDecoration: 'none' }} href={`tel:${departOuvert.telephoneCompagnie.replace(/\s/g, '')}`}>
                            <FaPhoneAlt size={13} /> Appeler
                        </a>
                    </div>
                </>
                ) : (
                    <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>
                        Le numéro de cet expéditeur n'est pas encore disponible. Contactez-nous à contact@gvipcolis.com, nous vous mettrons en relation.
                    </p>
                )}
                <button type="button" className={styles.boutonSecondairePartenaire} style={{ marginTop: 4 }} onClick={fermerDetailsDepart}>Fermer</button>
            </div>
            )}
        </div>
    </div>
)}

{/* modal "se connecter" */}
{modalConnexionOuvert && (
    <div className={styles.overlayPartenaire} onClick={fermerModalConnexion}>
        <div className={styles.fenetrePartenaire} onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>

            <div className={styles.entetePartenaire}>
                <p className={styles.titrePartenaire}>{modeOubli ? 'Mot de passe oublié' : 'Se connecter'}</p>
                <button
                    type="button"
                    className={styles.boutonFermerPartenaire}
                    onClick={fermerModalConnexion}
                    aria-label="Fermer"
                >
                    <FaTimes size={18} />
                </button>
            </div>

            {modeOubli ? (
            <form className={styles.corpsFormulairePartenaire} onSubmit={envoyerOubli}>
                <div className={styles.contenuEtapePartenaire}>
                    {oubliEnvoye ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                        <FaCheckCircle size={44} color="rgb(39, 123, 48)" />
                        <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
                            Si un compte existe avec l'adresse <strong>{formConnexion.email.trim()}</strong>,
                            vous allez recevoir un email avec un lien pour choisir un nouveau mot de passe.
                        </p>
                        <p style={{ margin: 0, fontSize: 12.5, color: '#6b7280' }}>
                            Pensez à regarder dans vos courriers indésirables (spams).
                        </p>
                    </div>
                    ) : (
                    <>
                        <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>
                            Entrez l'adresse email de votre compte partenaire. Nous vous enverrons un lien pour choisir un nouveau mot de passe.
                        </p>
                        <div className={styles.champPartenaire}>
                            <label>Email</label>
                            <div style={{ position: 'relative' }}>
                                <FaEnvelope
                                    size={14}
                                    color="rgba(0,0,0,0.4)"
                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                                />
                                <input
                                    type="email"
                                    required
                                    autoFocus
                                    value={formConnexion.email}
                                    onChange={(e) => majChampConnexion('email', e.target.value)}
                                    placeholder="contact@exemple.com"
                                    style={{ paddingLeft: 32 }}
                                />
                            </div>
                        </div>
                    </>
                    )}

                    {erreurOubli && (
                        <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{erreurOubli}</p>
                    )}
                </div>

                <div className={styles.piedFormulairePartenaire} style={{ flexDirection: 'column', gap: 10 }}>
                    {oubliEnvoye ? (
                    <>
                        <button
                            type="submit"
                            className={styles.boutonSecondairePartenaire}
                            disabled={oubliEnCours || delaiRenvoi > 0}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {oubliEnCours ? 'Envoi...' : delaiRenvoi > 0 ? `Renvoyer l'email (${delaiRenvoi} s)` : "Renvoyer l'email"}
                        </button>
                        <button
                            type="button"
                            className={styles.boutonPrincipalPartenaire}
                            onClick={retourConnexion}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            Retour à la connexion
                        </button>
                    </>
                    ) : (
                    <>
                        <button
                            type="submit"
                            className={styles.boutonPrincipalPartenaire}
                            disabled={oubliEnCours}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            {oubliEnCours ? 'Envoi en cours...' : 'Envoyer le lien'}
                        </button>
                        <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'rgb(39, 123, 48)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            onClick={retourConnexion}
                        >
                            <FaArrowLeft size={11} /> Retour à la connexion
                        </button>
                    </>
                    )}
                </div>
            </form>
            ) : (
            <form className={styles.corpsFormulairePartenaire} onSubmit={envoyerConnexion}>

                <div className={styles.contenuEtapePartenaire}>

                    <div className={styles.champPartenaire}>
                        <label>Email</label>
                        <div style={{ position: 'relative' }}>
                            <FaEnvelope
                                size={14}
                                color="rgba(0,0,0,0.4)"
                                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <input
                                type="email"
                                required
                                value={formConnexion.email}
                                onChange={(e) => majChampConnexion('email', e.target.value)}
                                placeholder="contact@exemple.com"
                                style={{ paddingLeft: 32 }}
                            />
                        </div>
                    </div>

                    <div className={styles.champPartenaire}>
                        <label>Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <FaLock
                                size={14}
                                color="rgba(0,0,0,0.4)"
                                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <input
                                type={motDePasseVisible ? 'text' : 'password'}
                                required
                                value={formConnexion.motDePasse}
                                onChange={(e) => majChampConnexion('motDePasse', e.target.value)}
                                placeholder="••••••••"
                                style={{ paddingLeft: 32, paddingRight: 32 }}
                            />
                            <button
                                type="button"
                                onClick={() => setMotDePasseVisible((v) => !v)}
                                aria-label={motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)',
                                    display: 'flex', padding: 0
                                }}
                            >
                                {motDePasseVisible ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                            </button>
                        </div>
                    </div>

                    {erreurConnexion && (
                        <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{erreurConnexion}</p>
                    )}

                    <button
                        type="button"
                        style={{
                            background: 'none', border: 'none', color: 'rgb(39, 123, 48)',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'right',
                            padding: 0, alignSelf: 'flex-end'
                        }}
                        onClick={() => { setModeOubli(true); setErreurOubli(''); }}
                    >
                        Mot de passe oublié ?
                    </button>
                </div>

                <div className={styles.piedFormulairePartenaire} style={{ flexDirection: 'column', gap: 10 }}>
                    <button
                        type="submit"
                        className={styles.boutonPrincipalPartenaire}
                        disabled={connexionEnCours}
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {connexionEnCours ? 'Connexion...' : 'Se connecter'}
                    </button>

                    <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', margin: 0 }}>
                        Pas encore partenaire ?{' '}
                        <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'rgb(39, 123, 48)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                            onClick={() => { fermerModalConnexion(); ouvrirModalPartenaire(); }}
                        >
                            Devenir partenaire
                        </button>
                    </p>
                </div>
            </form>
            )}
        </div>
    </div>
)}

{/* modal "devenir partenaire" - transporteurs de colis uniquement, formulaire simplifie */}
{modalPartenaireOuvert && (
    <div className={styles.overlayPartenaire} onClick={fermerModalPartenaire}>
        <div className={styles.fenetrePartenaire} onClick={(e) => e.stopPropagation()}>

            <div className={styles.entetePartenaire}>
                <p className={styles.titrePartenaire}>
                    {demandeEnvoyee ? 'Demande envoyée' : 'Devenir partenaire transporteur'}
                </p>
                <button
                    type="button"
                    className={styles.boutonFermerPartenaire}
                    onClick={fermerModalPartenaire}
                    aria-label="Fermer"
                >
                    <FaTimes size={18} />
                </button>
            </div>

            {demandeEnvoyee ? (
                <div className={styles.confirmationPartenaire}>
                    <FaCheckCircle size={50} color="rgb(39, 123, 48)" />
                    <p className={styles.confirmationPartenaireTitre}>
                        Merci, {formPartenaire.prenom || 'votre demande'} !
                    </p>
                    <p className={styles.confirmationPartenaireTexte}>
                        Votre demande de partenariat a bien été enregistrée. Notre équipe
                        vous contactera sous peu à l'adresse {formPartenaire.email}.
                    </p>
                    <button type="button" className={styles.boutonPrincipalPartenaire} onClick={fermerModalPartenaire}>
                        Fermer
                    </button>
                </div>
            ) : (
                <form className={styles.corpsFormulairePartenaire} onSubmit={envoyerDemandePartenaire}>

                    <div className={styles.contenuEtapePartenaire}>
                        <div className={styles.choixTypePartenaire}>
                            <div className={styles.bandeauTypePartenaire}>
                                <span className={styles.bandeauTypeIcone}><FaBus size={20} /></span>
                                <div>
                                    <p className={styles.bandeauTypeTitre}>Compagnie de transport de colis</p>
                                    <p className={styles.bandeauTypeTexte}>Publiez vos départs et recevez des demandes d'expédition</p>
                                </div>
                                <FaCheckCircle size={18} className={styles.bandeauTypeCoche} />
                            </div>
                        </div>

                        <p className={styles.sousTitrePartenaire}>Vos informations</p>
                        <div className={styles.grilleChampsPartenaire}>
                            <div className={`${styles.champPartenaire} ${styles.champPleineLargeurPartenaire}`}>
                                <label>Nom de l'entreprise / compagnie</label>
                                <input
                                    type="text"
                                    required
                                    value={formPartenaire.nomEntreprise}
                                    onChange={(e) => majChampPartenaire('nomEntreprise', e.target.value)}
                                    placeholder="Ex : Sika Transport"
                                />
                            </div>
                            <div className={styles.champPartenaire}>
                                <label>Nom</label>
                                <input
                                    type="text"
                                    required
                                    value={formPartenaire.nom}
                                    onChange={(e) => majChampPartenaire('nom', e.target.value)}
                                    placeholder="Ex : Kouassi"
                                />
                            </div>
                            <div className={styles.champPartenaire}>
                                <label>Prénom</label>
                                <input
                                    type="text"
                                    required
                                    value={formPartenaire.prenom}
                                    onChange={(e) => majChampPartenaire('prenom', e.target.value)}
                                    placeholder="Ex : Jean"
                                />
                            </div>
                            <div className={styles.champPartenaire}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formPartenaire.email}
                                    onChange={(e) => majChampPartenaire('email', e.target.value)}
                                    placeholder="contact@structure.com"
                                />
                            </div>
                            <div className={styles.champPartenaire}>
                                <label>Numéro de téléphone</label>
                                <input
                                    type="tel"
                                    inputMode="tel"
                                    required
                                    value={formPartenaire.telephone}
                                    onChange={(e) => majChampPartenaire('telephone', filtrerTelephone(e.target.value))}
                                    placeholder="+225 07 00 00 00 00"
                                />
                            </div>
                        </div>

                        <p className={styles.sousTitrePartenaire}>Documents</p>
                        <div className={styles.grilleDepotPartenaire}>
                            <ZoneDepotFichier
                                label="Logo de l'entreprise"
                                description="PNG ou JPG, max 2 Mo"
                                accept="image/*"
                                fichier={fichiersPartenaire.logo}
                                onChange={(f) => setFichiersPartenaire((prec) => ({ ...prec, logo: f }))}
                            />
                            <ZoneDepotFichier
                                label="Preuve d'activité (registre, agrément...)"
                                description="PDF, PNG ou JPG, max 5 Mo"
                                accept="application/pdf,image/*"
                                fichier={fichiersPartenaire.preuve}
                                onChange={(f) => setFichiersPartenaire((prec) => ({ ...prec, preuve: f }))}
                            />
                        </div>

                        {erreurPartenaire && (
                            <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{erreurPartenaire}</p>
                        )}
                    </div>

                    <div className={styles.piedFormulairePartenaire}>
                        <button
                            type="submit"
                            className={styles.boutonPrincipalPartenaire}
                            disabled={envoiEnCours}
                        >
                            {envoiEnCours ? 'Envoi en cours...' : 'Envoyer ma demande'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    </div>
)}

</>
    )
}
export default Acceuil;

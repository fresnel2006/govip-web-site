import { useState, useRef, useEffect, useMemo } from 'react';
import { useMediaQuery } from 'react-responsive';
import { FaArrowRight, FaCalendar, FaClock, FaSearch, FaTag, FaTimes, FaUsers, FaPaperPlane, FaRegCalendarAlt, FaCheckCircle, FaBars, FaInstagram, FaTiktok, FaYoutube, FaWhatsapp, FaBus, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaCloudUploadAlt, FaFileAlt } from 'react-icons/fa';
import styles from '../Acceuil/Acceuil.module.css'
import logo_entreprise from '../assets/logo_entreprise.png'
import { FaMoneyBill, FaShield } from 'react-icons/fa6';
import { CI, FR } from 'country-flag-icons/react/3x2';
// On passe uniquement par les fonctions du fichier Firebase partage,
// sans appeler firebase/database ou firebase/storage directement.
import { connexionAdmin, creerDemandePartenaire, ecouterToutesExpeditions, estDepartAffiche, prochaineDateDepart, libelleFrequence } from '../firebase/firebase';

// etat initial du formulaire "devenir partenaire" - uniquement transporteurs de colis
const ETAT_INITIAL_PARTENAIRE = {
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

    useEffect(() => {
        return ecouterToutesExpeditions(
            (liste) => {
                setDeparts(liste);
                setChargementDeparts(false);
            },
            () => setChargementDeparts(false)
        );
    }, []);

    // prochains departs : expeditions planifiees a venir, compagnies non suspendues, du plus proche au plus lointain
    const prochainsDeparts = useMemo(
        () => departs
            .filter(estDepartAffiche)
            .map((d) => ({ ...d, prochaine: prochaineDateDepart(d) }))
            .sort((a, b) => a.prochaine - b.prochaine || (a.heure || '').localeCompare(b.heure || '')),
        [departs]
    );
    const nbDepartsApercu = isMobile ? 2 : 3;
    const departsAffiches = voirTousDeparts ? prochainsDeparts : prochainsDeparts.slice(0, nbDepartsApercu);

    // etats du modal "se connecter"
    const [modalConnexionOuvert, setModalConnexionOuvert] = useState(false);
    const [formConnexion, setFormConnexion] = useState(ETAT_INITIAL_CONNEXION);
    const [motDePasseVisible, setMotDePasseVisible] = useState(false);
    const [erreurConnexion, setErreurConnexion] = useState('');
    const [connexionEnCours, setConnexionEnCours] = useState(false);

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
            await creerDemandePartenaire(formPartenaire, fichiersPartenaire);
            setDemandeEnvoyee(true);
        } catch (err) {
            console.error('Erreur lors de l\'envoi de la demande de partenariat :', err);
            setErreurPartenaire('Une erreur est survenue, veuillez réessayer.');
        } finally {
            setEnvoiEnCours(false);
        }
    };

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
<p>Acceuil</p>
            </div>
            <div className={styles.trouver_depart} onClick={() => scrollVers('trouver-depart')}>
<p>Trouver un depart</p>
            </div>
            <div className={styles.nos_transport} onClick={() => scrollVers('nos-transport')}>
<p>Nos transport</p>
            </div>
            <div className={styles.comment_ca_marche} onClick={() => scrollVers('comment-ca-marche')}>
<p>Comment ca marche</p>
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
<p>Acceuil</p>
            </div>
            <div className={styles.trouver_depart} onClick={() => scrollVers('trouver-depart')}>
<p>Trouver un depart</p>
            </div>
            <div className={styles.nos_transport} onClick={() => scrollVers('nos-transport')}>
<p>Nos transport</p>
            </div>
            <div className={styles.comment_ca_marche} onClick={() => scrollVers('comment-ca-marche')}>
<p>Comment ca marche</p>
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
                    <div className={styles.description1}>
<p>Trouvez le meilleur<br />depart pour <span className={styles.ecriture_verte}>vos colis</span></p>

                    </div>
                    <div className={styles.description2}>
<p>GVIP Colis est la plateforme qui centralise les departs</p>
<p>proposes par les trasnporteurs fiables.</p>
<p>Coparez, choisissez et expediez en toutes confiance.</p>
<div className={styles.description3}>

<div className={styles.info1}>
<div className={styles.icone}>
<FaShield size={30} color="green"/>
</div>
<div className={styles.mini_description}>
<p style={{color:"green"}}><strong>Transporteurs verifies</strong></p>
<p style={{fontWeight:700,fontSize:13}}> Des partenaires de confiance</p>
</div>
</div>

<div className={styles.info1}>
<div className={styles.icone}>
< FaCalendar size={30} color="green"/>
</div>
<div className={styles.mini_description}>
<p style={{color:"green"}}><strong>Depart reguliers</strong></p>
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
                    </div>

                </div>
                <div className={styles.image_arriere1}>
                
                </div>
            </div>
            <div className={styles.trouver_depart_body} id="trouver-depart">
<p style={{fontSize: isMobile ? 20 : 25}}> <strong>Trouvez un depart</strong></p>
<div className={styles.formulaire}>
    <div className={styles.champs}>
        <p>Pays de depart</p>
        <select>
        <option value="">Pays de départ</option>
        <option value="ci">Côte d'Ivoire</option>
        <option value="sn">Sénégal</option>
      </select>
</div>
<div className={styles.champs}>
      <p>Ville de depart</p>

      
      <input
        type="text"
        name="ville_depart"
        placeholder="Ex : Abidjan, Yamoussoukro..."
        autoComplete="off"
      />
</div>
      <div className={styles.champs}>
      <p>Pays de destination</p>

      <select>
        <option value="">Pays de destination</option>
        <option value="ci">Côte d'Ivoire</option>
        <option value="fr">France</option>
      </select>
</div>
      <div className={styles.champs}>
      <p >Date de depart</p>

      <input
        type="date"
        name="date_depart"
        min={new Date().toISOString().split('T')[0]}
      />
</div>
      
    </div>

</div>
            </div>
            <div className={styles.depart_recent_body} id="nos-transport">
                <div className={styles.depart_recent_entete}>
                <p style={{fontSize: isMobile ? 20 : 30,fontWeight:800}}>Departs recents</p>
                {prochainsDeparts.length > nbDepartsApercu && (
                <button type='button' className={styles.lien_voir_tout} onClick={() => setVoirTousDeparts((v) => !v)}>
                    {voirTousDeparts ? 'Voir moins' : `Voir tous les departs (${prochainsDeparts.length})`} <FaArrowRight size={13}/>
                </button>
                )}
                </div>
                {chargementDeparts ? (
                    <p style={{ color: '#6b7280' }}>Chargement des departs...</p>
                ) : prochainsDeparts.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>Aucun depart programme pour le moment. Revenez bientot !</p>
                ) : (
                <div className={styles.container_des_compagnies} style={voirTousDeparts && !isMobile ? { flexWrap: 'wrap' } : undefined}>
                {departsAffiches.map((d) => (
                <div key={d.id} className={styles.compagnies}>
                    <div className={styles.info_compagnie1}>
<div className={styles.partie1}>
<div className={styles.information_sur_depart}>
    <p>Depart confirme</p>
</div>
<p><strong>{formatDateCarte(d.prochaine)}</strong> </p>
</div>
<div className={styles.partie2}>

<p><DrapeauPays pays={d.paysDepart} />       {d.paysDepart || d.villeDepart}</p>
<FaArrowRight/>
<p><DrapeauPays pays={d.paysArrivee} />        {d.paysArrivee || d.villeArrivee}</p>

</div>
<div className={styles.reference}>
    <p><FaClock/>     Heure</p>
    <p><FaCalendar/>     Frequence</p>
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
                    <div className={styles.info_compagnie2}>
<div className={styles.image_nom_des_compagnies}>

<div className={styles.images_compagines} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
{initialesCompagnie(d.nomCompagnie)}
</div>
<div className={styles.nom_avis_compagnies}>
<p><strong>{d.nomCompagnie || 'Compagnie GVIP'}</strong></p>
<p>{d.villeDepart} → {d.villeArrivee}</p>
</div>
</div>
<div className={styles.voir_details}>
<button type='button' className={styles.bouton_voir_detail} onClick={() => setDepartOuvert(d)}>Voir les details</button>
</div>
</div>

                    </div>
                ))}
                </div>
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
        <p className={styles.etapeTexte}>Sélectionnez le transporteur et le départ qui vous convient</p>
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
    <p style={{marginBottom:20,fontSize:21}}><strong>Navigation</strong></p>
    <p>Accueil <br />
Trouver un départ<br />
Nos transporteurs<br />
Comment ça marche<br />
A propos<br />
Contact</p>
</div>
<div className={styles.footer_partie3}>
    <p style={{marginBottom:20,fontSize:21}}><strong>Espace partenaire</strong></p>
    <p>Se connecter<br />
Devenir partenaire<br />
Publier un départ<br />
Tableau de bord</p>
</div>
<div className={styles.footer_partie4}>
<p style={{marginBottom:20,fontSize:21}}><strong>Informations</strong></p>
<p>Conditions générales (CGV)<br />
Politique de confidentialité<br />
Mentions légales<br />
FAQ<br />
Nous contacter</p>
</div>
<div className={styles.footer_partie5} id="contact">
    <p style={{marginBottom:20,fontSize:21}}><strong>Suivez-nous</strong></p>
<p><FaInstagram/> <FaTiktok/> <FaYoutube/> <FaWhatsapp/> <br />

Contact<br />
contact@gvipcolis.com<br />
+33 6 00 00 00 00<br />
Lun - Ven : 9h00 - 18h00</p>
</div>
        </div>

{/* modal "details d'un depart" */}
{departOuvert && (
    <div className={styles.overlayPartenaire} onClick={() => setDepartOuvert(null)}>
        <div className={styles.fenetrePartenaire} onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
            <div className={styles.entetePartenaire}>
                <p className={styles.titrePartenaire}>{departOuvert.nomCompagnie || 'Depart'}</p>
                <button
                    type="button"
                    className={styles.boutonFermerPartenaire}
                    onClick={() => setDepartOuvert(null)}
                    aria-label="Fermer"
                >
                    <FaTimes size={18} />
                </button>
            </div>
            <div className={styles.corpsFormulairePartenaire}>
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, margin: 0 }}>
                    <DrapeauPays pays={departOuvert.paysDepart} /> {departOuvert.villeDepart}
                    <FaArrowRight size={13} />
                    <DrapeauPays pays={departOuvert.paysArrivee} /> {departOuvert.villeArrivee}
                </p>
                {[
                    ['Prochain depart', `${formatDateCarte(departOuvert.prochaine)}${departOuvert.heure ? ` a ${departOuvert.heure}` : ''}`],
                    ['Frequence', libelleFrequence(departOuvert)],
                    ['Limite par client', departOuvert.limiteKg ? `${departOuvert.limiteKg} kg` : '—'],
                    ['Tarif', departOuvert.tarifParKilo ? `${formatPrix(departOuvert.tarifParKilo)} € par kg` : '—'],
                    ...(departOuvert.notes ? [['A savoir', departOuvert.notes]] : []),
                ].map(([label, valeur]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <strong style={{ textAlign: 'right' }}>{valeur}</strong>
                    </div>
                ))}
            </div>
        </div>
    </div>
)}

{/* modal "se connecter" */}
{modalConnexionOuvert && (
    <div className={styles.overlayPartenaire} onClick={fermerModalConnexion}>
        <div className={styles.fenetrePartenaire} onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>

            <div className={styles.entetePartenaire}>
                <p className={styles.titrePartenaire}>Se connecter</p>
                <button
                    type="button"
                    className={styles.boutonFermerPartenaire}
                    onClick={fermerModalConnexion}
                    aria-label="Fermer"
                >
                    <FaTimes size={18} />
                </button>
            </div>

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
                        onClick={() => console.log('TODO : mot de passe oublie')}
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
        </div>
    </div>
)}

{/* modal "devenir partenaire" - transporteurs de colis uniquement, formulaire simplifie */}
{modalPartenaireOuvert && (
    <div className={styles.overlayPartenaire} onClick={fermerModalPartenaire}>
        <div className={styles.fenetrePartenaire} onClick={(e) => e.stopPropagation()}>

            <div className={styles.entetePartenaire}>
                <p className={styles.titrePartenaire}>
                    {demandeEnvoyee ? 'Demande envoyee' : 'Devenir partenaire transporteur'}
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
                        Votre demande de partenariat a bien ete enregistree. Notre equipe
                        vous contactera sous peu a l'adresse {formPartenaire.email}.
                    </p>
                    <button type="button" className={styles.boutonPrincipalPartenaire} onClick={fermerModalPartenaire}>
                        Fermer
                    </button>
                </div>
            ) : (
                <form className={styles.corpsFormulairePartenaire} onSubmit={envoyerDemandePartenaire}>

                    <div className={styles.contenuEtapePartenaire}>
                        <div className={styles.choixTypePartenaire}>
                            <div className={styles.carteChoixPartenaireActive} style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                                <FaBus size={22} color="rgb(39, 123, 48)" />
                                <p><strong>Compagnie de transport de colis</strong></p>
                            </div>
                        </div>

                        <p className={styles.sousTitrePartenaire}>Vos informations</p>
                        <div className={styles.grilleChampsPartenaire}>
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
                                <label>Prenom</label>
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
                                <label>Numero de telephone</label>
                                <input
                                    type="tel"
                                    required
                                    value={formPartenaire.telephone}
                                    onChange={(e) => majChampPartenaire('telephone', e.target.value)}
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

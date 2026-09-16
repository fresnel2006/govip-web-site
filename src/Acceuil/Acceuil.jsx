import { useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { FaArrowRight, FaCalendar, FaClock, FaSearch, FaStar, FaTag, FaTimes, FaUsers, FaPaperPlane, FaRegCalendarAlt, FaCheckCircle, FaBars, FaInstagram, FaTiktok, FaYoutube, FaWhatsapp, FaBus, FaLock, FaEnvelope, FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from '../Acceuil/Acceuil.module.css'
import logo_entreprise from '../assets/logo_entreprise.png'
import { FaMoneyBill, FaShield } from 'react-icons/fa6';
import { CI, FR } from 'country-flag-icons/react/3x2';

// etat initial du formulaire "devenir partenaire" - uniquement transporteurs de colis
const ETAT_INITIAL_PARTENAIRE = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
};

// etat initial du formulaire "se connecter"
const ETAT_INITIAL_CONNEXION = {
    email: '',
    motDePasse: '',
};

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
    const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

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
        setDemandeEnvoyee(false);
    };

    const majChampPartenaire = (champ, valeur) => {
        setFormPartenaire((precedent) => ({ ...precedent, [champ]: valeur }));
    };

    const envoyerDemandePartenaire = (e) => {
        e.preventDefault();
        // TODO : remplacer par un enregistrement Firebase (ex: push dans "demandesPartenaires")
        console.log('Nouvelle demande de partenariat transporteur :', formPartenaire);
        setDemandeEnvoyee(true);
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

    const envoyerConnexion = (e) => {
        e.preventDefault();
        setErreurConnexion('');
        setConnexionEnCours(true);

        // TODO : remplacer par Firebase Auth, ex :
        // signInWithEmailAndPassword(auth, formConnexion.email, formConnexion.motDePasse)
        //   .then((cred) => { ... rediriger vers le tableau de bord ... })
        //   .catch((err) => setErreurConnexion("Email ou mot de passe incorrect"))
        //   .finally(() => setConnexionEnCours(false));

        console.log('Tentative de connexion :', formConnexion);

        // simulation temporaire en attendant le branchement Firebase Auth
        setTimeout(() => {
            setConnexionEnCours(false);
            setErreurConnexion("Email ou mot de passe incorrect");
        }, 800);
    };

    return(
<>

<div className={styles.corps}>

{/*le header de la page */}

        <div className={styles.header}>

            {/*le logo de l'entreprise */}

            <div className={styles.logo_entreprise}>
<img src={logo_entreprise} alt="logo de l'entreprise" srcset="" />
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
                <button type='button' className={styles.lien_voir_tout}>
                    Voir tous les departs <FaArrowRight size={13}/>
                </button>
                </div>
                <div className={styles.container_des_compagnies}>

                <div className={styles.compagnies}>
                    <div className={styles.info_compagnie1}>
<div className={styles.partie1}>
<div className={styles.information_sur_depart}>
    <p>Depart confirme</p>
</div>
<p><strong>Dim. 04 Mai</strong> </p>
</div>
<div className={styles.partie2}>

<p><FR title="Côte d'Ivoire" className={styles.drapeau_mini}></FR>       France</p>
<FaArrowRight/>
<p><CI title="Côte d'Ivoire" className={styles.drapeau_mini}></CI>        Cote D'Ivoire</p>

</div>
<div className={styles.reference}>
    <p><FaClock/>     Heures</p>
    <p><FaCalendar/>     Frequence</p>
    <p><FaClock/>     Limite</p>
    <p><FaMoneyBill/>     Tarif</p>
</div>
<div className={styles.reference}>
<p>17:00</p>
    <p>Tous les samedis</p>
    <p>30 KG</p>
    <p>4,00</p>
</div>

                    </div>
                    <div className={styles.info_compagnie2}>
<div className={styles.image_nom_des_compagnies}>
    
<div className={styles.images_compagines}>

</div>
<div className={styles.nom_avis_compagnies}>
<p><strong>Ivoire Express</strong></p>
<p><FaStar color='yellow' />4.8(128 avis)</p>
</div>
</div>
<div className={styles.voir_details}>
<button type='submit' className={styles.bouton_voir_detail}>Voir les details</button>
</div>
</div>

                    </div><div className={styles.compagnies}>
                    <div className={styles.info_compagnie1}>
<div className={styles.partie1}>
<div className={styles.information_sur_depart}>
    <p>Depart confirme</p>
</div>
<p><strong>Dim. 04 Mai</strong> </p>
</div>
<div className={styles.partie2}>

<p><FR title="Côte d'Ivoire" className={styles.drapeau_mini}></FR>       France</p>
<FaArrowRight/>
<p><CI title="Côte d'Ivoire" className={styles.drapeau_mini}></CI>        Cote D'Ivoire</p>

</div>
<div className={styles.reference}>
    <p><FaClock/>     Heures</p>
    <p><FaCalendar/>     Frequence</p>
    <p><FaClock/>     Limite</p>
    <p><FaMoneyBill/>     Tarif</p>
</div>
<div className={styles.reference}>
<p>17:00</p>
    <p>Tous les samedis</p>
    <p>30 KG</p>
    <p>4,00</p>
</div>

                    </div>
                    <div className={styles.info_compagnie2}>
<div className={styles.image_nom_des_compagnies}>
    
<div className={styles.images_compagines}>

</div>
<div className={styles.nom_avis_compagnies}>
<p><strong>Ivoire Express</strong></p>
<p><FaStar color='yellow' />4.8(128 avis)</p>
</div>
</div>
<div className={styles.voir_details}>
<button type='submit' className={styles.bouton_voir_detail}>Voir les details</button>
</div>
</div>

                    </div>
                {!isMobile && (
                <div className={styles.compagnies}>
                    <div className={styles.info_compagnie1}>
<div className={styles.partie1}>
<div className={styles.information_sur_depart}>
    <p>Depart confirme</p>
</div>
<p><strong>Dim. 04 Mai</strong> </p>
</div>
<div className={styles.partie2}>

<p><FR title="Côte d'Ivoire" className={styles.drapeau_mini}></FR>       France</p>
<FaArrowRight/>
<p><CI title="Côte d'Ivoire" className={styles.drapeau_mini}></CI>        Cote D'Ivoire</p>

</div>
<div className={styles.reference}>
    <p><FaClock/>     Heures</p>
    <p><FaCalendar/>     Frequence</p>
    <p><FaClock/>     Limite</p>
    <p><FaMoneyBill/>     Tarif</p>
</div>
<div className={styles.reference}>
<p>17:00</p>
    <p>Tous les samedis</p>
    <p>30 KG</p>
    <p>4,00</p>
</div>

                    </div>
                    <div className={styles.info_compagnie2}>
<div className={styles.image_nom_des_compagnies}>
    
<div className={styles.images_compagines}>

</div>
<div className={styles.nom_avis_compagnies}>
<p><strong>Ivoire Express</strong></p>
<p><FaStar color='yellow' />4.8(128 avis)</p>
</div>
</div>
<div className={styles.voir_details}>
<button type='submit' className={styles.bouton_voir_detail}>Voir les details</button>
</div>
</div>

                    </div>
                )}
                </div>
                
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
                    </div>

                    <div className={styles.piedFormulairePartenaire}>
                        <button type="submit" className={styles.boutonPrincipalPartenaire}>
                            Envoyer ma demande
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
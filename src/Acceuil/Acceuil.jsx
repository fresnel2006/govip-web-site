import { FaArrowRight, FaCalendar, FaClock, FaHourglass, FaSearch, FaStar, FaTag, FaTimes, FaTimesCircle, FaUsers,FaPaperPlane,FaRegCalendarAlt,FaCheckCircle } from 'react-icons/fa';
import styles from '../Acceuil/Acceuil.module.css'
import logo_entreprise from '../assets/logo_entreprise.png'
import { FaArrowLeft, FaHouseCircleCheck, FaMoneyBill, FaShield } from 'react-icons/fa6';
import { CI, FR } from 'country-flag-icons/react/3x2';

function Acceuil(){
    return(
<>

<div className={styles.corps}>

{/*le header de la page */}

        <div className={styles.header}>

            {/*le logo de l'entreprise */}

            <div className={styles.logo_entreprise}>
<img src={logo_entreprise} alt="logo de l'entreprise" srcset="" />
            </div>

            {/*les onglets de navigations de la page  */}

            <div className={styles.navigation}>

            
            <div className={styles.acceuil}>
<p>Acceuil</p>
            </div>
            <div className={styles.trouver_depart}>
<p>Trouver un depart</p>
            </div>
            <div className={styles.nos_transport}>
<p>Nos transport</p>
            </div>
            <div className={styles.comment_ca_marche}>
<p>Comment ca marche</p>
            </div>
            <div className={styles.a_propos}>
<p>A propos</p>
            </div>
            <div className={styles.contact}>
<p>Contact</p>
            </div>

        </div>

        {/*message pour devemir partenaire */}


        <div className={styles.demande_partenariat}>
            <FaUsers size={50} color='rgb(39, 123, 48)'/>
            <div className={styles.descritpion}>
<p><strong >Vous transporter aussi des colis ?</strong></p>
<p>Alors devenez partenaire !</p>
            </div>
        </div>

        {/*les boutons permettant de se connecter ou de devenir partenaire */}

        <div className={styles.bouton_header}>
<div className={styles.se_connecter}>
    <button type='submit'>Se connecter</button>
</div>
<div className={styles.devenir_partenaire}>
    <button type='submit'> Devenir partenaire</button>
</div>
        </div>
        </div>

        <div className={styles.body}>

            <div className={styles.acceuil_body}>
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
<FaShield size={30}/>
</div>
<div className={styles.mini_description}>
<p><strong>Transporteurs verifies</strong></p>
<p> Des partenaires de confiance</p>
</div>
</div>

<div className={styles.info1}>
<div className={styles.icone}>
< FaCalendar size={30}/>
</div>
<div className={styles.mini_description}>
<p><strong>Depart reguliers</strong></p>
<p>Chaque jour,chaque semaine</p>
</div>
</div>

<div className={styles.info1}>
<div className={styles.icone}>
<FaTag size={30}/>
</div>
<div className={styles.mini_description}>
<p> <strong>Tarifs transparents</strong></p>
<p>Comparez et choisissez</p>
</div>
</div>

</div>
                    </div>

                </div>
                <div className={styles.image_arriere1}>
                
                </div>
            </div>
            <div className={styles.trouver_depart_body}>
<p style={{fontSize:25}}> <strong>Trouvez un depart</strong></p>
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

      <select>
        <option value="">Pays de destination</option>
        <option value="ci">Côte d'Ivoire</option>
        <option value="fr">France</option>
      </select>
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

      <select>
        <option value="">Pays de destination</option>
        <option value="ci">Côte d'Ivoire</option>
        <option value="fr">France</option>
      </select>
</div>
    </div>

</div>
            </div>
            <div className={styles.depart_recent_body}>
                <p style={{fontSize:30,fontWeight:800,marginBottom:20}}>Departs recents</p>
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
                </div>
                
            </div>
            <div className={styles.comment_ca_marche_body}>
<div class={styles.commentCaMarcheIntro}>
    <p class={styles.commentCaMarcheTitre}>Comment ça marche ?</p>
    <p class={styles.commentCaMarcheSousTitre}>Expédier votre colis en 4 étapes simples</p>
</div>
<FaArrowRight className={styles.etapeIcone}/>
<FaSearch className={styles.etapeIcone}/>
<div class={styles.etape}>
      <div class={styles.etapeIconeConteneur}>
        <p class={styles.etapeNumero}>1</p>
      </div>
      <div class={styles.etapeContenu}>
        <p class={styles.etapeTitre}>Recherchez</p>
        <p class={styles.etapeTexte}>Trouvez un départ selon votre destination et vos besoins</p>
      </div>
    </div>
<FaArrowRight />
<div class={styles.etape}>
      <div class={styles.etapeIconeConteneur}>
        <p class={styles.etapeNumero}>2</p>
        <FaRegCalendarAlt className={styles.etapeIcone} />
      </div>
      <div class={styles.etapeContenu}>
        <p class={styles.etapeTitre}>Choisissez</p>
        <p class={styles.etapeTexte}>Sélectionnez le transporteur et le départ qui vous convient</p>
      </div>
    </div>

    <FaArrowRight />
    <div class={styles.etape}>
      <div class={styles.etapeIconeConteneur}>
        <p class={styles.etapeNumero}>3</p>
        <FaPaperPlane className={styles.etapeIcone} />
      </div>
      <div class={styles.etapeContenu}>
        <p class={styles.etapeTitre}>Envoyez votre demande</p>
        <p class={styles.etapeTexte}>Remplissez le formulaire et envoyez votre demande</p>
      </div>
    </div>

<FaArrowRight />

    <div class={styles.etape}>
      <div class={styles.etapeIconeConteneur}>
        <p class={styles.etapeNumero}>4</p>
        <FaCheckCircle className={styles.etapeIcone} />
      </div>
      <div class={styles.etapeContenu}>
        <p class={styles.etapeTitre}>Confirmez et expédiez</p>
        <p class={styles.etapeTexte}>Le transporteur vous contacte et récupère votre colis</p>
      </div>
    </div>
            </div>

        </div>
        <div className={styles.footer}>
<div className={styles.footer_partie1}>
    <div className={styles.image_entreprise}>

    </div>
<p>GVIP Colis centralise les départs de colis proposés par des transporteurs fiables pour vous offrir la meilleure expérience d'expédition.</p>
<FR title="Côte d'Ivoire" className={styles.drapeau_mini} style={{marginRight:10}}></FR>
<CI title="Côte d'Ivoire" className={styles.drapeau_mini}></CI>  

</div>
<div className={styles.footer_partie2}>
    <p style={{marginBottom:20,fontSize:21}}><strong>Navigation</strong></p>
    <p>Navigation <br />
Accueil <br />
Trouver un départ<br />
Nos transporteurs<br />
Comment ça marche<br />
A propos<br />
Contact</p>
</div>
<div className={styles.footer_partie3}>
    <p style={{marginBottom:20,fontSize:21}}><strong>Espace partenaire</strong></p>
    <p>Espace partenaire
Se connecter<br />
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
<div className={styles.footer_partie5}>
    <p style={{marginBottom:20,fontSize:21}}><strong>Suivez-nous</strong></p>
<p>(icônes : Instagram, TikTok, YouTube, WhatsApp)

Contact<br />
contact@gvipcolis.com<br />
+33 6 00 00 00 00<br />
Lun - Ven : 9h00 - 18h00</p>
</div>
        </div>

</>
    )
}
export default Acceuil;
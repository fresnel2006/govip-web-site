import { FaCalendar, FaTag, FaUsers } from 'react-icons/fa';
import styles from '../Acceuil/Acceuil.module.css'
import logo_entreprise from '../assets/logo_entreprise.png'
import { FaShield } from 'react-icons/fa6';

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
<p> <strong>Trouvez un depart</strong></p>
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
      <p>Date de depart</p>

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
                
            </div>
            <div className={styles.comment_ca_marche_body}>
                
            </div>

        </div>
        <div className={styles.footer}>

        </div>

</>
    )
}
export default Acceuil;
import { FaUsers } from 'react-icons/fa';
import styles from '../Acceuil/Acceuil.module.css'
import logo_entreprise from '../assets/logo_entreprise.png'

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

            </div>
            <div className={styles.trouver_depart_body}>

            </div>
            <div className={styles.depart_recent_body}>
                
            </div>
            <div className={styles.comment_ca_marche_body}>
                
            </div>

        </div>
        <div className={styles.footer}>

        </div>
</div>
</>
    )
}
export default Acceuil;
const {onValueCreated, onValueDeleted, onValueWritten} = require("firebase-functions/v2/database");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getDatabase} = require("firebase-admin/database");
const nodemailer = require("nodemailer");

initializeApp();

// Adresse de l'espace partenaire, mise dans l'email d'identifiants
const URL_ESPACE_PARTENAIRE = "https://govip-web-site.vercel.app/espace_partenaire";

// Identifiants Gmail chargés depuis functions/.env
// (Firebase CLI charge ce fichier automatiquement au "firebase deploy"
// et pour l'émulateur — aucune config supplémentaire à faire, et ça ne
// touche pas du tout à Vercel).
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Échappe les caractères HTML des valeurs saisies par les clients, pour
// qu'elles s'affichent telles quelles dans l'email au lieu d'être
// interprétées comme du HTML.
function echapperHtml(valeur) {
  if (valeur === undefined || valeur === null || valeur === "") return "N/A";
  return String(valeur)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

exports.notifierNouveauRendezVous = onValueCreated(
  {
    ref: "/rendezVous/{rendezvousId}",
  },
  async (event) => {
    const rendezvous = event.data.val();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const dateCommande = rendezvous.dateCreation
      ? new Date(rendezvous.dateCreation).toLocaleString("fr-FR", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : "N/A";

    await transporter.sendMail({
      from: `"GVIP Notifications" <${GMAIL_USER}>`,
      to: GMAIL_USER,
      subject: "Nouveau rendez-vous pris - GVIP",
      html: `
        <h2>Nouveau rendez-vous</h2>
        <p><strong>Client :</strong> ${echapperHtml(rendezvous.nomComplet)}</p>
        <p><strong>Téléphone :</strong> ${echapperHtml(rendezvous.telephone)}</p>
        <p><strong>Email :</strong> ${echapperHtml(rendezvous.email)}</p>

        <h3>Rendez-vous</h3>
        <p><strong>Date du rendez-vous :</strong> ${echapperHtml(rendezvous.date)}</p>
        <p><strong>Heure :</strong> ${echapperHtml(rendezvous.heureDebut)} - ${echapperHtml(rendezvous.heureFin)}</p>
        <p><strong>Numéro de commande :</strong> ${echapperHtml(rendezvous.numeroCommande)}</p>
        <p><strong>Date de la commande :</strong> ${dateCommande}</p>

        <h3>Détails du colis</h3>
        <p><strong>Type de colis :</strong> ${echapperHtml(rendezvous.typeColis)}</p>
        <p><strong>Taille du colis :</strong> ${echapperHtml(rendezvous.tailleColis)}</p>
        <p><strong>Destination :</strong> ${echapperHtml(rendezvous.destination)}</p>
        <p><strong>Adresse :</strong> ${echapperHtml(rendezvous.adresse)}</p>
        <p><strong>Notes :</strong> ${echapperHtml(rendezvous.notes)}</p>

        <h3>Service</h3>
        <p><strong>Dépôt :</strong> ${echapperHtml(rendezvous.depotLibelle)}</p>
        <p><strong>Récupération :</strong> ${echapperHtml(rendezvous.recuperationLibelle)}</p>
      `,
    });

    console.log("Email de notification envoyé pour le rendez-vous", event.params.rendezvousId);
  }
);

// AJOUT : notification par email a chaque nouvelle demande de partenariat
// transporteur (formulaire "devenir partenaire" sur la page d'accueil).
// Se declenche automatiquement dès qu'une entree est creee sous
// "/demandesPartenaires/{demandeId}" dans la Realtime Database.
exports.notifierNouvelleDemandePartenaire = onValueCreated(
  {
    ref: "/demandesPartenaires/{demandeId}",
  },
  async (event) => {
    const demande = event.data.val();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const dateDemande = demande.dateCreation
      ? new Date(demande.dateCreation).toLocaleString("fr-FR", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : "N/A";

    await transporter.sendMail({
      from: `"GVIP Notifications" <${GMAIL_USER}>`,
      to: GMAIL_USER,
      subject: "Nouvelle demande de partenariat - GVIP",
      html: `
        <h2>Nouvelle demande de partenariat transporteur</h2>
        <p><strong>Entreprise :</strong> ${echapperHtml(demande.nomEntreprise || "—")}</p>
        <p><strong>Nom :</strong> ${echapperHtml(demande.nom)}</p>
        <p><strong>Prénom :</strong> ${echapperHtml(demande.prenom)}</p>
        <p><strong>Email :</strong> ${echapperHtml(demande.email)}</p>
        <p><strong>Téléphone :</strong> ${echapperHtml(demande.telephone)}</p>
        <p><strong>Date de la demande :</strong> ${dateDemande}</p>

        <h3>Documents</h3>
        ${demande.logoUrl ? `<p><strong>Logo :</strong><br/><img src="${echapperHtml(demande.logoUrl)}" style="max-width:200px;border-radius:8px;" /></p>` : "<p><strong>Logo :</strong> non fourni</p>"}
        ${demande.preuveUrl ? `<p><strong>Preuve d'activité :</strong> <a href="${echapperHtml(demande.preuveUrl)}">Voir le document</a></p>` : "<p><strong>Preuve d'activité :</strong> non fournie</p>"}
      `,
    });

    console.log("Email de notification envoyé pour la demande partenaire", event.params.demandeId);
  }
);

// AJOUT : envoie ses identifiants de connexion a une compagnie que l'admin vient de creer.
// Juste apres la creation du compte, l'espace admin depose le mot de passe dans
// "/partenaires/{uid}/envoiIdentifiants" (ecriture reservee a l'admin et a la compagnie).
// Cette fonction se declenche, envoie l'email, note le resultat dans la fiche puis
// efface aussitot le mot de passe de la base. L'email destinataire est celui de la fiche.
exports.envoyerIdentifiantsCompagnie = onValueCreated(
  {
    ref: "/partenaires/{uidCompagnie}/envoiIdentifiants",
  },
  async (event) => {
  const {uidCompagnie} = event.params;
  const motDePasse = event.data.val()?.motDePasse;
  const refFiche = event.data.ref.parent;

  try {
  const compagnie = (await refFiche.get()).val();
  if (!motDePasse || !compagnie?.email) {
    throw new Error("Mot de passe ou email de la compagnie manquant");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"GVIP Colis" <${GMAIL_USER}>`,
    to: compagnie.email,
    subject: "Bienvenue sur GVIP Colis - vos identifiants de connexion",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
        <h2 style="color:#277b30">Bienvenue sur GVIP Colis, ${echapperHtml(compagnie.nom)} !</h2>
        <p>Votre compte partenaire pour <strong>${echapperHtml(compagnie.nomEntreprise)}</strong> a été créé.
        Vous pouvez dès maintenant publier vos départs et recevoir des demandes d'expédition.</p>

        <h3 style="margin:24px 0 8px">Vos identifiants de connexion</h3>
        <div style="background:#f1f7f2;border:1px solid #cfe3d2;border-radius:10px;padding:16px">
          <p style="margin:0 0 8px"><strong>Email :</strong> ${echapperHtml(compagnie.email)}</p>
          <p style="margin:0"><strong>Mot de passe :</strong> ${echapperHtml(motDePasse)}</p>
        </div>

        <h3 style="margin:24px 0 8px">Les informations validées de votre compagnie</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${[
            ["Compagnie", compagnie.nomEntreprise],
            ["Responsable", compagnie.nom],
            ["Téléphone", compagnie.telephone],
            ["Pays", compagnie.pays],
            ["Adresse", compagnie.adresse],
          ].map(([label, valeur]) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">${label}</td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right"><strong>${echapperHtml(valeur)}</strong></td>
          </tr>`).join("")}
        </table>
        <p style="font-size:13px;color:#6b7280">Une information est inexacte ? Répondez à cet email pour la faire corriger.</p>

        <p style="text-align:center;margin:24px 0">
          <a href="${URL_ESPACE_PARTENAIRE}" style="background:#277b30;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
            Accéder à mon espace partenaire
          </a>
        </p>

        <p style="font-size:13px;color:#6b7280">Pour votre sécurité, gardez ce mot de passe pour vous.
        Pour en obtenir un nouveau, contactez-nous : nous vous enverrons un lien de réinitialisation.
        En cas de problème, contactez-nous à contact@gvipcolis.com.</p>
      </div>
    `,
  });

  await refFiche.update({identifiantsEnvoyes: Date.now(), erreurEnvoiIdentifiants: null});
  console.log("Identifiants envoyés à la compagnie", uidCompagnie);
  } catch (err) {
    console.error("Echec de l'envoi des identifiants", uidCompagnie, err);
    await refFiche.update({erreurEnvoiIdentifiants: String(err.message || err)});
  } finally {
    // le mot de passe ne reste jamais dans la base
    await event.data.ref.remove();
  }
  }
);


// AJOUT : quand l'admin supprime une compagnie (fiche "/partenaires/{uid}"), on supprime
// aussi son compte de connexion. Sans ca, l'email reste pris dans Firebase Auth et
// on ne peut plus recreer de compagnie avec la meme adresse.
exports.supprimerCompteCompagnie = onValueDeleted(
  {
    ref: "/partenaires/{uidCompagnie}",
  },
  async (event) => {
    const {uidCompagnie} = event.params;
    try {
      await getAuth().deleteUser(uidCompagnie);
      console.log("Compte de connexion supprimé pour la compagnie", uidCompagnie);
    } catch (err) {
      if (err.code === "auth/user-not-found") return;
      console.error("Echec suppression du compte de connexion", uidCompagnie, err);
    }
  }
);


// Cle d'un numero dans l'index : ses 9 derniers chiffres (ignore espaces et indicatif).
// Doit rester identique a cleTelephone() dans src/firebase/firebase.js.
function cleTelephone(telephone) {
  const chiffres = String(telephone || "").replace(/\D/g, "");
  return chiffres.length >= 8 ? chiffres.slice(-9) : null;
}

// AJOUT : index "/telephonesPartenaires/{cle}" des numeros deja pris par une compagnie.
// Le formulaire "devenir partenaire" le consulte pour refuser un numero deja utilise
// (un visiteur ne peut pas lire "/partenaires"). Mis a jour a chaque creation,
// modification ou suppression du numero d'une compagnie.
exports.indexerTelephoneCompagnie = onValueWritten(
  {
    ref: "/partenaires/{uidCompagnie}/telephone",
  },
  async (event) => {
    const index = getDatabase().ref("telephonesPartenaires");
    const ancienne = cleTelephone(event.data.before.val());
    const nouvelle = cleTelephone(event.data.after.val());
    if (ancienne === nouvelle) return;
    const modifications = {};
    if (ancienne) modifications[ancienne] = null;
    if (nouvelle) modifications[nouvelle] = true;
    await index.update(modifications);
  }
);

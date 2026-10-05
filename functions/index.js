const {onValueCreated} = require("firebase-functions/v2/database");
const nodemailer = require("nodemailer");

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
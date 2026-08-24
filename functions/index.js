const {onValueCreated} = require("firebase-functions/v2/database");
const nodemailer = require("nodemailer");

// Identifiants Gmail chargés depuis functions/.env
// (Firebase CLI charge ce fichier automatiquement au "firebase deploy"
// et pour l'émulateur — aucune config supplémentaire à faire, et ça ne
// touche pas du tout à Vercel).
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

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
        <p><strong>Client :</strong> ${rendezvous.nomComplet || "N/A"}</p>
        <p><strong>Téléphone :</strong> ${rendezvous.telephone || "N/A"}</p>
        <p><strong>Email :</strong> ${rendezvous.email || "N/A"}</p>

        <h3>Rendez-vous</h3>
        <p><strong>Date du rendez-vous :</strong> ${rendezvous.date || "N/A"}</p>
        <p><strong>Heure :</strong> ${rendezvous.heureDebut || "N/A"} - ${rendezvous.heureFin || "N/A"}</p>
        <p><strong>Numéro de commande :</strong> ${rendezvous.numeroCommande || "N/A"}</p>
        <p><strong>Date de la commande :</strong> ${dateCommande}</p>

        <h3>Détails du colis</h3>
        <p><strong>Type de colis :</strong> ${rendezvous.typeColis || "N/A"}</p>
        <p><strong>Taille du colis :</strong> ${rendezvous.tailleColis || "N/A"}</p>
        <p><strong>Destination :</strong> ${rendezvous.destination || "N/A"}</p>
        <p><strong>Adresse :</strong> ${rendezvous.adresse || "N/A"}</p>
        <p><strong>Notes :</strong> ${rendezvous.notes || "N/A"}</p>

        <h3>Service</h3>
        <p><strong>Dépôt :</strong> ${rendezvous.depotLibelle || "N/A"}</p>
        <p><strong>Récupération :</strong> ${rendezvous.recuperationLibelle || "N/A"}</p>
      `,
    });

    console.log("Email de notification envoyé pour le rendez-vous", event.params.rendezvousId);
  }
);
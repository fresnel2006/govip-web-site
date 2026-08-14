const {onValueCreated} = require("firebase-functions/v2/database");
const {defineSecret} = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const gmailAppPassword = defineSecret("GVIPCOLISFIREBASE");

exports.notifierNouveauRendezVous = onValueCreated(
  {
    ref: "/rendezvous/{rendezvousId}",
    secrets: [gmailAppPassword],
  },
  async (event) => {
    const rendezvous = event.data.val();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "govioservice.sell@gmail.com",
        pass: gmailAppPassword.value(),
      },
    });

    await transporter.sendMail({
      from: '"GVIP Notifications" <govioservice.sell@gmail.com>',
      to: "govioservice.sell@gmail.com",
      subject: "Nouveau rendez-vous pris - GVIP",
      html: `
        <h2>Nouveau rendez-vous</h2>
        <p><strong>Client :</strong> ${rendezvous.nomClient || "N/A"}</p>
        <p><strong>Date :</strong> ${rendezvous.date || "N/A"}</p>
        <p><strong>Heure :</strong> ${rendezvous.heure || "N/A"}</p>
        <p><strong>Numéro de commande :</strong> ${rendezvous.numeroCommande || "N/A"}</p>
      `,
    });

    console.log("Email de notification envoyé pour le rendez-vous", event.params.rendezvousId);
  }
);
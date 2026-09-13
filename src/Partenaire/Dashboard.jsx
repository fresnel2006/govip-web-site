import React, { useState } from "react";
import styles from "./Dashboard.module.css";

const navItems = [
  { label: "Tableau de bord", icon: "home", key: "dashboard" },
  { label: "Mes expéditions", icon: "package", key: "expeditions" },
  { label: "Mes revenus", icon: "wallet", key: "revenus" },
  { label: "Mon profil", icon: "user", key: "profil" },
  { label: "Support", icon: "headset", key: "support" },
];

const statusStyles = {
  "En cours": "statusInProgress",
  "À récupérer": "statusPickup",
  "Planifié": "statusPlanned",
  "Livré": "statusDelivered",
};

const initialShipments = [
  { id: "GV-10234", date: "07 mai 2025", from: "Paris", to: "Abidjan", weight: "10 kg", status: "En cours" },
  { id: "GV-10235", date: "08 mai 2025", from: "Lille", to: "Abidjan", weight: "5 kg", status: "À récupérer" },
  { id: "GV-10236", date: "10 mai 2025", from: "Rennes", to: "Abidjan", weight: "20 kg", status: "Planifié" },
  { id: "GV-10237", date: "12 mai 2025", from: "Paris", to: "Abidjan", weight: "15 kg", status: "Planifié" },
  { id: "GV-10238", date: "02 mai 2025", from: "Marseille", to: "Abidjan", weight: "8 kg", status: "Livré" },
  { id: "GV-10239", date: "28 avril 2025", from: "Paris", to: "Abidjan", weight: "12 kg", status: "Livré" },
];

const initialForm = { date: "", from: "", to: "Abidjan", weight: "", status: "Planifié" };

const news = [
  { date: "06 mai 2025", title: "Nouveau trajet : Paris – Abidjan", text: "Nous renforçons notre réseau pour vous offrir encore plus de flexibilité.", tone: "ocean" },
  { date: "28 avril 2025", title: "Optimisez vos envois", text: "Découvrez nos nouvelles options de suivi et de gestion de vos expéditions.", tone: "boxes" },
  { date: "15 avril 2025", title: "Rejoignez la communauté GVIP", text: "Devenez partenaire et profitez d'avantages exclusifs.", tone: "brand" },
];

const chartPoints = [8, 20, 18, 32, 30, 46, 42, 58, 55, 70, 66, 82];
const revenusChartPoints = [8, 20, 18, 32, 30, 46, 42, 58, 55, 70, 66, 82];

const initialTransactions = [
  { id: "TR-8841", date: "12 mai 2025", label: "Expédition GV-10234", amount: 45.0, status: "Payé" },
  { id: "TR-8840", date: "10 mai 2025", label: "Expédition GV-10236", amount: 62.5, status: "En attente" },
  { id: "TR-8839", date: "08 mai 2025", label: "Expédition GV-10235", amount: 30.0, status: "Payé" },
  { id: "TR-8838", date: "02 mai 2025", label: "Expédition GV-10238", amount: 38.0, status: "Payé" },
  { id: "TR-8837", date: "28 avr. 2025", label: "Expédition GV-10239", amount: 40.0, status: "Payé" },
];
const transactionStatusStyles = { "Payé": "statusPaid", "En attente": "statusPending" };

const initialProfile = {
  nom: "Jean Dupont",
  raisonSociale: "GVIP Transport",
  email: "jean.dupont@example.com",
  telephone: "+33 6 12 34 56 78",
  pays: "France",
  adresse: "12 rue de la Paix, 75002 Paris",
};

const faqs = [
  { q: "Comment suivre une expédition en cours ?", a: "Rendez-vous dans « Mes expéditions », chaque envoi affiche son statut en temps réel (Planifié, En cours, À récupérer, Livré)." },
  { q: "Quand suis-je payé après une livraison ?", a: "Les paiements sont traités automatiquement 48h après confirmation de la livraison et apparaissent dans « Mes revenus »." },
  { q: "Comment modifier mes informations bancaires ?", a: "Depuis « Mon profil », section Sécurité, vous pouvez mettre à jour vos coordonnées de paiement." },
  { q: "Puis-je annuler une expédition planifiée ?", a: "Oui, tant que le statut est « Planifié ». Contactez le support pour toute annulation d'une expédition déjà en cours." },
];

const tickets = [
  { id: "TK-204", date: "10 mai 2025", subject: "Colis non récupéré à Lille", status: "En cours" },
  { id: "TK-198", date: "02 mai 2025", subject: "Question sur un paiement", status: "Résolu" },
];
const ticketStatusStyles = { "En cours": "statusInProgress", "Résolu": "statusResolved" };

const expeditionFilters = ["Tous", "En cours", "À récupérer", "Planifié", "Livré"];

function Icon({ name, className }) {
  const paths = {
    home: <path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" />,
    package: (
      <>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8" />
        <path d="M12 13v9" />
      </>
    ),
    truck: (
      <>
        <path d="M2 8h11v8H2z" />
        <path d="M13 11h4l4 3v2h-8z" />
        <circle cx="6" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </>
    ),
    wallet: (
      <>
        <path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        <path d="M3 7 5 3h11l2 4" />
        <circle cx="16.5" cy="13.5" r="1.2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
      </>
    ),
    headset: (
      <>
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <rect x="2.5" y="13" width="4" height="6" rx="1.4" />
        <rect x="17.5" y="13" width="4" height="6" rx="1.4" />
        <path d="M20 19v1a3 3 0 0 1-3 3h-3" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 1.9-1.1 1.6-3 1.9c-2 .3-3 .9-3 2s1.3 1.9 3 1.9 3-.8 3-2" />
      </>
    ),
    star: <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.5Z" />,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronUp: <path d="m6 15 6-6 6 6" />,
    arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="M12 8.2v.1M12 11v5.4" />
      </>
    ),
    map: (
      <>
        <circle cx="12" cy="10" r="3.2" />
        <path d="M12 21c4.5-4.6 7-8 7-11a7 7 0 0 0-14 0c0 3 2.5 6.4 7 11Z" />
      </>
    ),
    ship: (
      <>
        <path d="M4 15h16l-2 5H6l-2-5Z" />
        <path d="M6 15V9h9l3 6" />
        <path d="M10 9V4h3v5" />
      </>
    ),
    plane: <path d="M2 16l7-2 4-9 2 .6-2 8.4 6-1.4.6 2-6 3-1 4-2-.4 1-3.6-6 1.6-2-1.6Z" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    check: <path d="m5 13 4 4L19 7" />,
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="m8 12.5 2.6 2.6L16.5 9" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    question: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="M9.3 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.5 1.6-2.5 3.4" />
        <path d="M12 17v.1" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1.1.5 1.1 1.1V20c0 .6-.5 1.1-1.1 1.1C10.6 21.1 2.9 13.4 2.9 4.3 2.9 3.7 3.4 3.2 4 3.2h3.3c.6 0 1.1.5 1.1 1.1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.8Z" />,
    lock: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l2-2h6l2 2h3v11H4Z" />
        <circle cx="12" cy="13.5" r="3.4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    send: <path d="m3 11 18-8-8 18-2-8-8-2Z" />,
  };
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function buildChartPath(points, width, height) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / (max - min)) * height;
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area, coords };
}

export default function Dashboard() {
  // ---------- Navigation ----------
  const [navOpen, setNavOpen] = useState(false);
  const [section, setSection] = useState("dashboard");

  // ---------- Expéditions (partagé Dashboard + page Expéditions) ----------
  const [shipments, setShipments] = useState(initialShipments);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [formExpedition, setFormExpedition] = useState(initialForm);
  const [expFilter, setExpFilter] = useState("Tous");
  const [expSearch, setExpSearch] = useState("");

  // ---------- Revenus ----------
  const [transactions] = useState(initialTransactions);
  const [retraitOuvert, setRetraitOuvert] = useState(false);
  const [montant, setMontant] = useState("");

  // ---------- Profil ----------
  const [profile, setProfile] = useState(initialProfile);
  const [profilForm, setProfilForm] = useState(initialProfile);
  const [profilEditMode, setProfilEditMode] = useState(false);

  // ---------- Support ----------
  const [openFaq, setOpenFaq] = useState(null);
  const [supportForm, setSupportForm] = useState({ sujet: "", message: "" });
  const [supportEnvoye, setSupportEnvoye] = useState(false);

  const majChampExpedition = (champ, valeur) => setFormExpedition((prec) => ({ ...prec, [champ]: valeur }));
  const ouvrirModal = () => setModalOuvert(true);
  const fermerModal = () => {
    setModalOuvert(false);
    setFormExpedition(initialForm);
  };
  const ajouterExpedition = (e) => {
    e.preventDefault();
    if (!formExpedition.date || !formExpedition.from || !formExpedition.weight) return;
    const id = `GV-${Math.floor(10000 + Math.random() * 89999)}`;
    setShipments((prec) => [{ ...formExpedition, id }, ...prec]);
    fermerModal();
  };

  const demanderRetrait = (e) => {
    e.preventDefault();
    setRetraitOuvert(false);
    setMontant("");
  };

  const majChampProfil = (champ, valeur) => setProfilForm((p) => ({ ...p, [champ]: valeur }));
  const annulerProfil = () => {
    setProfilForm(profile);
    setProfilEditMode(false);
  };
  const enregistrerProfil = (e) => {
    e.preventDefault();
    setProfile(profilForm);
    setProfilEditMode(false);
  };

  const majChampSupport = (champ, valeur) => setSupportForm((p) => ({ ...p, [champ]: valeur }));
  const envoyerSupport = (e) => {
    e.preventDefault();
    if (!supportForm.sujet || !supportForm.message) return;
    setSupportEnvoye(true);
    setSupportForm({ sujet: "", message: "" });
    setTimeout(() => setSupportEnvoye(false), 4000);
  };

  const allerA = (key) => {
    setSection(key);
    setNavOpen(false);
  };

  const { line, area, coords } = buildChartPath(chartPoints, 320, 110);
  const revenusChart = buildChartPath(revenusChartPoints, 680, 160);

  const initials = profile.nom.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const filteredShipments = shipments.filter((s) => {
    const matchFilter = expFilter === "Tous" || s.status === expFilter;
    const q = expSearch.toLowerCase();
    const matchSearch = s.id.toLowerCase().includes(q) || s.from.toLowerCase().includes(q) || s.to.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const totalPaye = transactions.filter((t) => t.status === "Payé").reduce((s, t) => s + t.amount, 0);
  const enAttente = transactions.filter((t) => t.status === "En attente").reduce((s, t) => s + t.amount, 0);

  return (
    <div className={styles.app}>
      {navOpen && <div className={styles.backdrop} onClick={() => setNavOpen(false)} />}

      <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <Icon name="arrowUp" className={styles.logoMark} />
            GVIP
          </div>
          <button className={styles.closeNav} onClick={() => setNavOpen(false)} aria-label="Fermer le menu">
            <Icon name="close" className={styles.navIcon} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`${styles.navItem} ${section === item.key ? styles.navItemActive : ""}`}
              onClick={() => allerA(item.key)}
            >
              <Icon name={item.icon} className={styles.navIcon} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.referralCard}>
          <Icon name="truck" className={styles.referralIcon} />
          <p className={styles.referralTitle}>
            Plus de colis,
            <br />
            plus d&rsquo;opportunités !
          </p>
          <p className={styles.referralText}>Recommandez GVIP autour de vous et gagnez des commissions.</p>
          <button className={styles.referralButton}>
            En savoir plus <Icon name="arrowRight" className={styles.btnIcon} />
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} onClick={() => setNavOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" className={styles.navIcon} />
          </button>
          <div className={styles.searchSpace} />
          <div className={styles.profile}>
            <span className={styles.avatar}>{initials}</span>
            <span className={styles.profileText}>
              <strong>{profile.nom}</strong>
              <small>Transporteur partenaire</small>
            </span>
          </div>
        </header>

        <main className={styles.content}>
          {/* ============ TABLEAU DE BORD ============ */}
          {section === "dashboard" && (
            <div className={styles.contentGrid}>
              <div className={styles.leftColumn}>
                <section className={styles.hero}>
                  <div className={styles.heroLeft}>
                    <div className={styles.heroBadge}>
                      <Icon name="arrowUp" className={styles.heroBadgeIcon} />
                    </div>
                    <h1>Bonjour {profile.nom.split(" ")[0]},</h1>
                    <p className={styles.heroLead}>Merci d&rsquo;être partenaire de GVIP !</p>
                    <p className={styles.heroSub}>
                      Ensemble, facilitons le transport de colis entre la France et la Côte d&rsquo;Ivoire.
                    </p>
                  </div>
                  <div className={styles.heroRight}>
                    <h2>Votre espace partenaire</h2>
                    <p>Suivez vos expéditions, gérez vos livraisons et développez votre activité.</p>
                    <button className={styles.heroButton} onClick={() => allerA("expeditions")}>
                      Voir mes expéditions <Icon name="arrowRight" className={styles.btnIcon} />
                    </button>
                  </div>
                </section>

                <section className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="package" className={styles.statIconSvg} />
                    </span>
                    <div>
                      <p className={styles.statValue}>{shipments.filter((s) => s.status === "En cours").length}</p>
                      <p className={styles.statLabel}>Expéditions en cours</p>
                      <p className={styles.statDelta}>
                        <Icon name="arrowUp" className={styles.statDeltaIcon} />
                        +2 cette semaine
                      </p>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="coin" className={styles.statIconSvg} />
                    </span>
                    <div>
                      <p className={styles.statValue}>{totalPaye.toFixed(0)} €</p>
                      <p className={styles.statLabel}>Total des revenus</p>
                      <p className={styles.statDelta}>
                        <Icon name="arrowUp" className={styles.statDeltaIcon} />
                        +18% ce mois
                      </p>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="truck" className={styles.statIconSvg} />
                    </span>
                    <div>
                      <p className={styles.statValue}>{shipments.filter((s) => s.status === "Livré").length}</p>
                      <p className={styles.statLabel}>Colis livrés</p>
                      <p className={styles.statDelta}>
                        <Icon name="arrowUp" className={styles.statDeltaIcon} />
                        +4 cette semaine
                      </p>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <Icon name="star" className={styles.statIconSvg} />
                    </span>
                    <div>
                      <p className={styles.statValue}>4,8/5</p>
                      <p className={styles.statLabel}>Note moyenne</p>
                      <p className={styles.statDelta}>
                        <Icon name="arrowUp" className={styles.statDeltaIcon} />
                        +0,2 cette semaine
                      </p>
                    </div>
                  </div>
                </section>

                <section className={styles.panelsGrid}>
                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <h3>Mes expéditions récentes</h3>
                      <div className={styles.panelHeaderActions}>
                        <button className={styles.addButton} onClick={ouvrirModal}>
                          <Icon name="plus" className={styles.linkIcon} />
                          Ajouter une expédition
                        </button>
                        <a href="#" className={styles.panelLink} onClick={(e) => { e.preventDefault(); allerA("expeditions"); }}>
                          Voir toutes <Icon name="arrowRight" className={styles.linkIcon} />
                        </a>
                      </div>
                    </div>
                    <div className={styles.tableScroll}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Destination</th>
                            <th>Poids</th>
                            <th>Statut</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {shipments.slice(0, 4).map((row, i) => (
                            <tr key={row.id + i}>
                              <td className={styles.dateCell}>
                                <Icon name="package" className={styles.rowIcon} />
                                {row.date}
                              </td>
                              <td>
                                {row.from} <Icon name="arrowRight" className={styles.routeIcon} /> {row.to}
                              </td>
                              <td>{row.weight}</td>
                              <td>
                                <span className={`${styles.badge} ${styles[statusStyles[row.status]]}`}>{row.status}</span>
                              </td>
                              <td className={styles.chevronCell}>
                                <Icon name="chevronRight" className={styles.chevronIcon} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <h3>
                        <svg viewBox="0 0 24 24" className={styles.panelTitleIcon} fill="currentColor">
                          <rect x="3" y="12" width="4" height="9" rx="1" />
                          <rect x="10" y="7" width="4" height="14" rx="1" />
                          <rect x="17" y="3" width="4" height="18" rx="1" />
                        </svg>
                        Vos performances
                      </h3>
                    </div>
                    <div className={styles.perfControls}>
                      <span className={styles.perfSelect}>
                        Ce mois-ci <Icon name="chevronDown" className={styles.linkIcon} />
                      </span>
                      <span className={styles.perfDelta}>+18%</span>
                    </div>
                    <svg viewBox="0 0 320 110" className={styles.chart} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1f8a4c" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#1f8a4c" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={area} fill="url(#chartFill)" />
                      <path d={line} fill="none" stroke="#1f8a4c" strokeWidth="2.5" />
                      {coords.map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="3" fill="#1f8a4c" />
                      ))}
                    </svg>
                    <div className={styles.perfStats}>
                      <div>
                        <p className={styles.perfValue}>{totalPaye.toFixed(0)} €</p>
                        <p className={styles.perfLabel}>Revenus totaux</p>
                      </div>
                      <div>
                        <p className={styles.perfValue}>{shipments.filter((s) => s.status === "Livré").length}</p>
                        <p className={styles.perfLabel}>Expéditions livrées</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className={styles.ctaBanner}>
                  <span className={styles.ctaIcon}>
                    <Icon name="truck" className={styles.statIconSvg} />
                  </span>
                  <div className={styles.ctaText}>
                    <h3>Gérer vos expéditions</h3>
                    <p>Suivez, modifiez ou planifiez vos prochaines livraisons en toute simplicité.</p>
                  </div>
                  <button className={styles.ctaButton} onClick={ouvrirModal}>Ajouter une expédition</button>
                </section>

                <section className={styles.newsSection}>
                  <div className={styles.panelHeader}>
                    <h3>
                      <svg viewBox="0 0 24 24" className={styles.panelTitleIcon} fill="currentColor">
                        <rect x="3" y="4" width="14" height="16" rx="1.5" />
                        <rect x="17" y="7" width="4" height="13" rx="1.5" />
                      </svg>
                      Dernières actualités
                    </h3>
                    <a href="#" className={styles.panelLink}>
                      Voir toutes les actualités <Icon name="arrowRight" className={styles.linkIcon} />
                    </a>
                  </div>
                  <div className={styles.newsGrid}>
                    {news.map((n) => (
                      <article className={styles.newsCard} key={n.title}>
                        <div className={`${styles.newsThumb} ${styles[`newsThumb_${n.tone}`]}`}>
                          {n.tone === "ship" || n.tone === "ocean" ? (
                            <Icon name="ship" className={styles.newsThumbIcon} />
                          ) : n.tone === "boxes" ? (
                            <Icon name="package" className={styles.newsThumbIcon} />
                          ) : (
                            <span className={styles.newsThumbLogo}>GVIP</span>
                          )}
                        </div>
                        <p className={styles.newsDate}>{n.date}</p>
                        <h4>{n.title}</h4>
                        <p className={styles.newsText}>{n.text}</p>
                        <a href="#" className={styles.newsLink}>
                          <Icon name="arrowRight" className={styles.linkIcon} />
                        </a>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <aside className={styles.rightColumn}>
                <div className={styles.infoCard}>
                  <h3>
                    <Icon name="user" className={styles.infoHeaderIcon} />
                    Mes informations
                  </h3>
                  <ul className={styles.infoList}>
                    <li>
                      <Icon name="user" className={styles.infoIcon} />
                      <span>
                        <small>Nom</small>
                        <strong>{profile.nom}</strong>
                      </span>
                    </li>
                    <li>
                      <Icon name="wallet" className={styles.infoIcon} />
                      <span>
                        <small>Raison sociale</small>
                        <strong>{profile.raisonSociale}</strong>
                      </span>
                    </li>
                    <li>
                      <Icon name="map" className={styles.infoIcon} />
                      <span>
                        <small>Pays d&rsquo;activité</small>
                        <strong>{profile.pays}</strong>
                      </span>
                    </li>
                    <li>
                      <Icon name="info" className={styles.infoIcon} />
                      <span>
                        <small>Statut</small>
                        <strong className={styles.statusActive}>
                          <i /> Partenaire actif
                        </strong>
                      </span>
                    </li>
                  </ul>
                </div>

                <div className={styles.helpCard}>
                  <span className={styles.helpIconWrap}>
                    <Icon name="headset" className={styles.helpIcon} />
                  </span>
                  <h3>Besoin d&rsquo;aide ?</h3>
                  <p>Notre équipe est disponible pour répondre à toutes vos questions.</p>
                  <button className={styles.helpButton} onClick={() => allerA("support")}>
                    Contacter le support <Icon name="arrowRight" className={styles.btnIcon} />
                  </button>
                </div>

                <div className={styles.promoCard}>
                  <Icon name="plane" className={styles.promoIcon} />
                  <h3>
                    Vous transportez aussi
                    <br />
                    des colis ?
                  </h3>
                  <p>Rejoignez notre réseau de partenaires et développez votre activité.</p>
                  <button className={styles.promoButton}>
                    En savoir plus <Icon name="arrowRight" className={styles.btnIcon} />
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* ============ MES EXPÉDITIONS ============ */}
          {section === "expeditions" && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Mes expéditions</h1>
                  <p className={styles.pageSubtitle}>{shipments.length} expéditions au total</p>
                </div>
                <button className={styles.addButton} onClick={ouvrirModal}>
                  <Icon name="plus" className={styles.linkIcon} />
                  Ajouter une expédition
                </button>
              </div>

              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <Icon name="search" className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Rechercher par référence ou ville..."
                    value={expSearch}
                    onChange={(e) => setExpSearch(e.target.value)}
                  />
                </div>
                <div className={styles.filterChips}>
                  {expeditionFilters.map((f) => (
                    <button
                      key={f}
                      className={`${styles.chip} ${expFilter === f ? styles.chipActive : ""}`}
                      onClick={() => setExpFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Date</th>
                        <th>Destination</th>
                        <th>Poids</th>
                        <th>Statut</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.length === 0 && (
                        <tr>
                          <td colSpan={6} className={styles.emptyCell}>
                            Aucune expédition ne correspond à votre recherche.
                          </td>
                        </tr>
                      )}
                      {filteredShipments.map((row) => (
                        <tr key={row.id}>
                          <td className={styles.refCell}>{row.id}</td>
                          <td className={styles.dateCell}>
                            <Icon name="package" className={styles.rowIcon} />
                            {row.date}
                          </td>
                          <td>
                            {row.from} <Icon name="arrowRight" className={styles.routeIcon} /> {row.to}
                          </td>
                          <td>{row.weight}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[statusStyles[row.status]]}`}>{row.status}</span>
                          </td>
                          <td className={styles.chevronCell}>
                            <Icon name="chevronRight" className={styles.chevronIcon} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ============ MES REVENUS ============ */}
          {section === "revenus" && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Mes revenus</h1>
                  <p className={styles.pageSubtitle}>Suivez vos gains et vos retraits</p>
                </div>
                <button className={styles.addButton} onClick={() => setRetraitOuvert(true)}>
                  <Icon name="wallet" className={styles.linkIcon} />
                  Demander un retrait
                </button>
              </div>

              <div className={styles.revStatsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>
                    <Icon name="coin" className={styles.statIconSvg} />
                  </span>
                  <div>
                    <p className={styles.statValue}>{totalPaye.toFixed(2)} €</p>
                    <p className={styles.statLabel}>Total perçu</p>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>
                    <Icon name="wallet" className={styles.statIconSvg} />
                  </span>
                  <div>
                    <p className={styles.statValue}>{enAttente.toFixed(2)} €</p>
                    <p className={styles.statLabel}>En attente de paiement</p>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>
                    <Icon name="arrowUp" className={styles.statIconSvg} />
                  </span>
                  <div>
                    <p className={styles.statValue}>+18%</p>
                    <p className={styles.statLabel}>Évolution ce mois</p>
                  </div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Évolution des revenus</h3>
                  <span className={styles.perfDelta}>+18% ce mois</span>
                </div>
                <svg viewBox="0 0 680 160" className={styles.chartWide} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="revenusFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f8a4c" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#1f8a4c" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={revenusChart.area} fill="url(#revenusFill)" />
                  <path d={revenusChart.line} fill="none" stroke="#1f8a4c" strokeWidth="2.5" />
                  {revenusChart.coords.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="#1f8a4c" />
                  ))}
                </svg>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3>Historique des transactions</h3>
                  <button className={styles.exportButton}>
                    <Icon name="download" className={styles.linkIcon} />
                    Exporter
                  </button>
                </div>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Montant</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td className={styles.refCell}>{t.id}</td>
                          <td>{t.date}</td>
                          <td>{t.label}</td>
                          <td className={styles.amountCell}>{t.amount.toFixed(2)} €</td>
                          <td>
                            <span className={`${styles.badge} ${styles[transactionStatusStyles[t.status]]}`}>{t.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ============ MON PROFIL ============ */}
          {section === "profil" && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Mon profil</h1>
                  <p className={styles.pageSubtitle}>Gérez vos informations personnelles et professionnelles</p>
                </div>
                {!profilEditMode && (
                  <button className={styles.addButton} onClick={() => setProfilEditMode(true)}>
                    <Icon name="edit" className={styles.linkIcon} />
                    Modifier
                  </button>
                )}
              </div>

              <div className={styles.profileGrid}>
                <div className={styles.avatarPanel}>
                  <div className={styles.avatarWrap}>
                    <span className={styles.profileAvatar}>{initials}</span>
                    {profilEditMode && (
                      <button type="button" className={styles.avatarEdit} aria-label="Changer la photo">
                        <Icon name="camera" className={styles.avatarEditIcon} />
                      </button>
                    )}
                  </div>
                  <h3>{profile.nom}</h3>
                  <p className={styles.profileRole}>Transporteur partenaire</p>
                  <span className={styles.statusActive}>
                    <i /> Compte actif
                  </span>
                </div>

                <form className={styles.panel} onSubmit={enregistrerProfil}>
                  <h3 className={styles.panelTitleStandalone}>
                    <Icon name="user" className={styles.panelTitleIcon} />
                    Informations générales
                  </h3>

                  <div className={styles.fieldGrid}>
                    <div className={styles.field}>
                      <label>Nom complet</label>
                      {profilEditMode ? (
                        <input value={profilForm.nom} onChange={(e) => majChampProfil("nom", e.target.value)} required />
                      ) : (
                        <p>{profile.nom}</p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label>Raison sociale</label>
                      {profilEditMode ? (
                        <input value={profilForm.raisonSociale} onChange={(e) => majChampProfil("raisonSociale", e.target.value)} />
                      ) : (
                        <p>{profile.raisonSociale}</p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label>Email</label>
                      {profilEditMode ? (
                        <input type="email" value={profilForm.email} onChange={(e) => majChampProfil("email", e.target.value)} required />
                      ) : (
                        <p>{profile.email}</p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label>Téléphone</label>
                      {profilEditMode ? (
                        <input value={profilForm.telephone} onChange={(e) => majChampProfil("telephone", e.target.value)} />
                      ) : (
                        <p>{profile.telephone}</p>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label>Pays d'activité</label>
                      {profilEditMode ? (
                        <select value={profilForm.pays} onChange={(e) => majChampProfil("pays", e.target.value)}>
                          <option value="France">France</option>
                          <option value="Côte d'Ivoire">Côte d&rsquo;Ivoire</option>
                        </select>
                      ) : (
                        <p>{profile.pays}</p>
                      )}
                    </div>
                    <div className={`${styles.field} ${styles.fieldWide}`}>
                      <label>Adresse</label>
                      {profilEditMode ? (
                        <input value={profilForm.adresse} onChange={(e) => majChampProfil("adresse", e.target.value)} />
                      ) : (
                        <p>{profile.adresse}</p>
                      )}
                    </div>
                  </div>

                  {profilEditMode && (
                    <div className={styles.formActions}>
                      <button type="button" className={styles.modalCancel} onClick={annulerProfil}>
                        Annuler
                      </button>
                      <button type="submit" className={styles.modalSubmit}>
                        <Icon name="check" className={styles.linkIcon} />
                        Enregistrer
                      </button>
                    </div>
                  )}
                </form>

                <div className={styles.panel}>
                  <h3 className={styles.panelTitleStandalone}>
                    <Icon name="lock" className={styles.panelTitleIcon} />
                    Sécurité
                  </h3>
                  <div className={styles.securityRow}>
                    <div>
                      <p className={styles.securityLabel}>Mot de passe</p>
                      <p className={styles.securityHint}>Dernière modification il y a 3 mois</p>
                    </div>
                    <button className={styles.securityButton}>Changer</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============ SUPPORT ============ */}
          {section === "support" && (
            <>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.pageTitle}>Support</h1>
                  <p className={styles.pageSubtitle}>Une question ? Notre équipe vous répond sous 24h</p>
                </div>
              </div>

              <div className={styles.contactGrid}>
                <a href="tel:+33100000000" className={styles.contactCard}>
                  <span className={styles.contactIcon}>
                    <Icon name="phone" className={styles.contactIconSvg} />
                  </span>
                  <div>
                    <p className={styles.contactLabel}>Par téléphone</p>
                    <p className={styles.contactValue}>+33 1 00 00 00 00</p>
                  </div>
                </a>
                <a href="mailto:support@gvip.com" className={styles.contactCard}>
                  <span className={styles.contactIcon}>
                    <Icon name="mail" className={styles.contactIconSvg} />
                  </span>
                  <div>
                    <p className={styles.contactLabel}>Par email</p>
                    <p className={styles.contactValue}>support@gvip.com</p>
                  </div>
                </a>
                <div className={styles.contactCard}>
                  <span className={styles.contactIcon}>
                    <Icon name="headset" className={styles.contactIconSvg} />
                  </span>
                  <div>
                    <p className={styles.contactLabel}>Chat en direct</p>
                    <p className={styles.contactValue}>Lun–Ven, 9h–18h</p>
                  </div>
                </div>
              </div>

              <div className={styles.supportMainGrid}>
                <div className={styles.panel}>
                  <h3 className={styles.panelTitleStandalone}>
                    <Icon name="question" className={styles.panelTitleIcon} />
                    Questions fréquentes
                  </h3>
                  <div className={styles.faqList}>
                    {faqs.map((f, i) => (
                      <div className={styles.faqItem} key={f.q}>
                        <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                          {f.q}
                          <Icon name={openFaq === i ? "chevronUp" : "chevronDown"} className={styles.faqIcon} />
                        </button>
                        {openFaq === i && <p className={styles.faqAnswer}>{f.a}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.panel}>
                  <h3 className={styles.panelTitleStandalone}>
                    <Icon name="send" className={styles.panelTitleIcon} />
                    Contacter le support
                  </h3>
                  {supportEnvoye && (
                    <div className={styles.successBanner}>
                      <Icon name="checkCircle" className={styles.successIcon} />
                      Votre message a bien été envoyé, nous revenons vers vous rapidement.
                    </div>
                  )}
                  <form className={styles.supportForm} onSubmit={envoyerSupport}>
                    <div className={styles.field}>
                      <label>Sujet</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex : Problème avec une expédition"
                        value={supportForm.sujet}
                        onChange={(e) => majChampSupport("sujet", e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Message</label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Décrivez votre problème..."
                        value={supportForm.message}
                        onChange={(e) => majChampSupport("message", e.target.value)}
                      />
                    </div>
                    <button type="submit" className={styles.modalSubmit}>
                      <Icon name="send" className={styles.linkIcon} />
                      Envoyer le message
                    </button>
                  </form>
                </div>
              </div>

              <div className={styles.panel}>
                <h3 className={styles.panelTitleStandalone}>Mes tickets</h3>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Date</th>
                        <th>Sujet</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id}>
                          <td className={styles.refCell}>{t.id}</td>
                          <td>{t.date}</td>
                          <td>{t.subject}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[ticketStatusStyles[t.status]]}`}>{t.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <span className={styles.footerLogo}>GVIP</span>
            <span>Votre partenaire transport</span>
          </div>
          <nav className={styles.footerLinks}>
            <a href="#">CGV</a>
            <a href="#">Mentions légales</a>
            <a href="#">Politique de confidentialité</a>
            <a href="#">FAQ</a>
          </nav>
          <div className={styles.footerRight}>
            <span>© 2026 GVIP Colis. Tous droits réservés.</span>
          </div>
        </footer>
      </div>

      {modalOuvert && (
        <div className={styles.overlay} onClick={fermerModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Ajouter une expédition</h3>
              <button className={styles.modalClose} onClick={fermerModal} aria-label="Fermer">
                <Icon name="close" className={styles.navIcon} />
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={ajouterExpedition}>
              <div className={styles.modalField}>
                <label>Date</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : 14 septembre 2026"
                  value={formExpedition.date}
                  onChange={(e) => majChampExpedition("date", e.target.value)}
                />
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Ville de départ</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Paris"
                    value={formExpedition.from}
                    onChange={(e) => majChampExpedition("from", e.target.value)}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Ville d'arrivée</label>
                  <input
                    type="text"
                    required
                    value={formExpedition.to}
                    onChange={(e) => majChampExpedition("to", e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Poids</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : 10 kg"
                    value={formExpedition.weight}
                    onChange={(e) => majChampExpedition("weight", e.target.value)}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Statut</label>
                  <select
                    value={formExpedition.status}
                    onChange={(e) => majChampExpedition("status", e.target.value)}
                  >
                    <option value="Planifié">Planifié</option>
                    <option value="En cours">En cours</option>
                    <option value="À récupérer">À récupérer</option>
                    <option value="Livré">Livré</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancel} onClick={fermerModal}>
                  Annuler
                </button>
                <button type="submit" className={styles.modalSubmit}>
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {retraitOuvert && (
        <div className={styles.overlay} onClick={() => setRetraitOuvert(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Demander un retrait</h3>
              <button className={styles.modalClose} onClick={() => setRetraitOuvert(false)} aria-label="Fermer">
                <Icon name="close" className={styles.navIcon} />
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={demanderRetrait}>
              <p className={styles.available}>
                Solde disponible : <strong>{totalPaye.toFixed(2)} €</strong>
              </p>
              <div className={styles.modalField}>
                <label>Montant à retirer (€)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={totalPaye}
                  placeholder="Ex : 50"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancel} onClick={() => setRetraitOuvert(false)}>
                  Annuler
                </button>
                <button type="submit" className={styles.modalSubmit}>
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
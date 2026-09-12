import React, { useState } from "react";
import styles from "./Dashboard.module.css";

const navItems = [
  { label: "Tableau de bord", icon: "home", active: true },
  { label: "Mes expéditions", icon: "package" },
  { label: "Mes revenus", icon: "wallet" },
  { label: "Mon profil", icon: "user" },
  { label: "Support", icon: "headset" },
];

const statusStyles = {
  "En cours": "statusInProgress",
  "À récupérer": "statusPickup",
  "Planifié": "statusPlanned",
};

const initialShipments = [
  { date: "07 mai 2025", from: "Paris", to: "Abidjan", weight: "10 kg", status: "En cours" },
  { date: "08 mai 2025", from: "Lille", to: "Abidjan", weight: "5 kg", status: "À récupérer" },
  { date: "10 mai 2025", from: "Rennes", to: "Abidjan", weight: "20 kg", status: "Planifié" },
  { date: "12 mai 2025", from: "Paris", to: "Abidjan", weight: "15 kg", status: "Planifié" },
];

const initialForm = {
  date: "",
  from: "",
  to: "Abidjan",
  weight: "",
  status: "Planifié",
};

const news = [
  {
    date: "06 mai 2025",
    title: "Nouveau trajet : Paris – Abidjan",
    text: "Nous renforçons notre réseau pour vous offrir encore plus de flexibilité.",
    tone: "ocean",
  },
  {
    date: "28 avril 2025",
    title: "Optimisez vos envois",
    text: "Découvrez nos nouvelles options de suivi et de gestion de vos expéditions.",
    tone: "boxes",
  },
  {
    date: "15 avril 2025",
    title: "Rejoignez la communauté GVIP",
    text: "Devenez partenaire et profitez d'avantages exclusifs.",
    tone: "brand",
  },
];

const chartPoints = [8, 20, 18, 32, 30, 46, 42, 58, 55, 70, 66, 82];

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
    star: (
      <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.5Z" />
    ),
    chevronRight: <path d="m9 6 6 6-6 6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
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
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area, coords };
}

export default function Dashboard() {
  const { line, area, coords } = buildChartPath(chartPoints, 320, 110);
  const [navOpen, setNavOpen] = useState(false);
  const [shipments, setShipments] = useState(initialShipments);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [formExpedition, setFormExpedition] = useState(initialForm);

  const majChampExpedition = (champ, valeur) => {
    setFormExpedition((prec) => ({ ...prec, [champ]: valeur }));
  };

  const ouvrirModal = () => setModalOuvert(true);

  const fermerModal = () => {
    setModalOuvert(false);
    setFormExpedition(initialForm);
  };

  const ajouterExpedition = (e) => {
    e.preventDefault();
    if (!formExpedition.date || !formExpedition.from || !formExpedition.weight) return;
    setShipments((prec) => [formExpedition, ...prec]);
    fermerModal();
  };

  return (
    <div className={styles.app}>
      {navOpen && (
        <div className={styles.backdrop} onClick={() => setNavOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <Icon name="arrowUp" className={styles.logoMark} />
            GVIP
          </div>
          <button
            className={styles.closeNav}
            onClick={() => setNavOpen(false)}
            aria-label="Fermer le menu"
          >
            <Icon name="close" className={styles.navIcon} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
              onClick={() => setNavOpen(false)}
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
          <p className={styles.referralText}>
            Recommandez GVIP autour de vous et gagnez des commissions.
          </p>
          <button className={styles.referralButton}>
            En savoir plus <Icon name="arrowRight" className={styles.btnIcon} />
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.menuButton}
            onClick={() => setNavOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" className={styles.navIcon} />
          </button>
          <div className={styles.searchSpace} />
          <div className={styles.profile}>
            <span className={styles.avatar}>JD</span>
            <span className={styles.profileText}>
              <strong>Jean Dupont</strong>
              <small>Transporteur partenaire</small>
            </span>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.contentGrid}>
            <div className={styles.leftColumn}>
              <section className={styles.hero}>
                <div className={styles.heroLeft}>
                  <div className={styles.heroBadge}>
                    <Icon name="arrowUp" className={styles.heroBadgeIcon} />
                  </div>
                  <h1>Bonjour Jean,</h1>
                  <p className={styles.heroLead}>Merci d&rsquo;être partenaire de GVIP !</p>
                  <p className={styles.heroSub}>
                    Ensemble, facilitons le transport de colis entre la France et la Côte
                    d&rsquo;Ivoire.
                  </p>
                </div>
                <div className={styles.heroRight}>
                  <h2>Votre espace partenaire</h2>
                  <p>
                    Suivez vos expéditions, gérez vos livraisons et développez votre
                    activité.
                  </p>
                  <button className={styles.heroButton}>
                    Voir mon tableau de bord <Icon name="arrowRight" className={styles.btnIcon} />
                  </button>
                </div>
              </section>

              <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>
                    <Icon name="package" className={styles.statIconSvg} />
                  </span>
                  <div>
                    <p className={styles.statValue}>{shipments.filter(s => s.status === "En cours").length}</p>
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
                    <p className={styles.statValue}>1 240 €</p>
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
                    <p className={styles.statValue}>12</p>
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
                      <a href="#" className={styles.panelLink}>
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
                      {shipments.map((row, i) => (
                        <tr key={row.date + row.to + i}>
                          <td className={styles.dateCell}>
                            <Icon name="package" className={styles.rowIcon} />
                            {row.date}
                          </td>
                          <td>
                            {row.from} <Icon name="arrowRight" className={styles.routeIcon} /> {row.to}
                          </td>
                          <td>{row.weight}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[statusStyles[row.status]]}`}>
                              {row.status}
                            </span>
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
                      <svg
                        viewBox="0 0 24 24"
                        className={styles.panelTitleIcon}
                        fill="currentColor"
                      >
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
                      <p className={styles.perfValue}>1 240 €</p>
                      <p className={styles.perfLabel}>Revenus totaux</p>
                    </div>
                    <div>
                      <p className={styles.perfValue}>12</p>
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
                      <strong>Jean Dupont</strong>
                    </span>
                  </li>
                  <li>
                    <Icon name="wallet" className={styles.infoIcon} />
                    <span>
                      <small>Raison sociale</small>
                      <strong>GVIP Transport</strong>
                    </span>
                  </li>
                  <li>
                    <Icon name="map" className={styles.infoIcon} />
                    <span>
                      <small>Pays d&rsquo;activité</small>
                      <strong>France</strong>
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
                <button className={styles.helpButton}>
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
                <p>
                  Rejoignez notre réseau de partenaires et développez votre activité.
                </p>
                <button className={styles.promoButton}>
                  En savoir plus <Icon name="arrowRight" className={styles.btnIcon} />
                </button>
              </div>
            </aside>
          </div>
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
            <span>© 2025 GVIP Colis. Tous droits réservés.</span>
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
    </div>
  );
}
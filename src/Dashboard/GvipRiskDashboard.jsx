import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./GvipRiskDashboard.module.css";

// Endpoint FastAPI exposé par main.py (/api/referentiel/statut)
// ⚠️ En prod, VITE_GVIP_API_URL doit être défini dans les Environment Variables
// du projet Vercel du FRONTEND (pas celui du backend), sinon on retombe sur
// l'URL de déploiement backend en dur ci-dessous.
const API_URL =
  import.meta.env?.VITE_GVIP_API_URL ||
  "https://fastapi-backend-go.vercel.app/api/referentiel/statut";

// On dérive l'URL de base de l'API (sans le suffixe /api/referentiel/statut)
// pour pouvoir appeler les autres routes du backend, comme la saisie manuelle.
const API_BASE_URL = API_URL.replace(/\/api\/referentiel\/statut\/?$/, "");
const MANUAL_EVENT_URL = `${API_BASE_URL}/api/evenements/manuel`;

const REFRESH_INTERVAL_MS = 30000; // Rafraîchissement des données depuis l'API
const TICK_INTERVAL_MS = 60000; // Rafraîchissement "visuel" des comptes à rebours (sans appel réseau)

const SEVERITY_LABEL = {
  critical: "Critique",
  medium: "Modéré",
  low: "Faible",
};

const SEVERITY_ORDER = { critical: 0, medium: 1, low: 2 };

const SEVERITY_FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "critical", label: "Critique" },
  { key: "medium", label: "Modéré" },
  { key: "low", label: "Faible" },
];

// ---------------------------------------------------------------------------
// Filtrage des zones "placeholder" sans événement réel
// ---------------------------------------------------------------------------
// L'API renvoie parfois des zones dont un champ (événement OU durée) vaut
// quelque chose comme "EXISTE PAS/AUCUNE MENTION" (dans une casse quelconque :
// majuscule, minuscule, mélangée...). Ces zones ne servent à rien à afficher,
// on les exclut donc systématiquement, peu importe le champ concerné ou la
// casse utilisée par le backend.
const INVALID_VALUE_PATTERNS = [
  "existe pas/aucune mention",
  "existe pas",
  "aucune mention",
];

function isInvalidValue(value) {
  if (!value) return false;
  const normalized = value.toString().trim().toLowerCase();
  return INVALID_VALUE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

// Une zone est invalide si SON événement OU SA durée correspond à un des
// motifs "placeholder" ci-dessus.
function isInvalidZone(zone) {
  return isInvalidValue(zone.evenement) || isInvalidValue(zone.rawDuree);
}

// ---------------------------------------------------------------------------
// Calcul de la durée / compte à rebours
// ---------------------------------------------------------------------------
// On parse un texte libre du type "3 jours", "2 semaines", "5 heures", "1 mois"
// pour en tirer une durée en millisecondes. Cette durée sert à calculer une
// échéance (maintenant + durée) la toute première fois qu'on voit une zone
// avec ce texte de durée précis. Cette échéance est ensuite :
//  1) envoyée au backend dans le champ `expire_at` pour les saisies manuelles
//     (au cas où la base de données saurait quoi en faire),
//  2) stockée localement (localStorage) pour que le dashboard calcule
//     lui-même, à chaque rendu, le temps restant réel (qui diminue tout seul)
//     et masque l'événement une fois ce délai dépassé.
function parseDureeToMs(duree) {
  if (!duree) return null;
  const normalized = duree.toString().trim().toLowerCase();
  const match = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(heures?|h|jours?|j|semaines?|sem|mois|ans?|ann[ée]es?)/
  );
  if (!match) return null;

  const value = parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(value)) return null;

  const unit = match[2];
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  if (unit.startsWith("h")) return value * HOUR;
  if (unit.startsWith("j")) return value * DAY;
  if (unit.startsWith("sem")) return value * 7 * DAY;
  if (unit.startsWith("mois")) return value * 30 * DAY;
  if (unit.startsWith("an")) return value * 365 * DAY;
  return null;
}

// Reconvertit un nombre de millisecondes restantes en texte lisible,
// ex: "2 j 5 h", "3 h 12 min", "< 1 min". Retourne null si le temps est écoulé.
function formatMsToDuree(ms) {
  if (ms == null || ms <= 0) return null;

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);

  if (days > 0) {
    return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return "< 1 min";
}

// Clé de stockage local unique par couple commune/événement.
const TRACKING_STORAGE_KEY = "gvip_zone_countdowns";

function loadTrackingMap() {
  try {
    const raw = window.localStorage.getItem(TRACKING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTrackingMap(map) {
  try {
    window.localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Stockage indisponible (navigation privée, quota dépassé…) : on continue
    // sans persister, le compte à rebours ne survivra juste pas à un rechargement.
  }
}

function trackingKey(commune, evenement) {
  return `${commune}::${evenement}`.toString().toLowerCase();
}

// Seuils partagés avec le backend (routes.py::score_to_level) : on les
// applique aussi côté client pour l'aperçu en direct dans le formulaire de
// saisie manuelle, et comme repli pour les zones dont impact_mobilite est absent.
function severityFromScore(score) {
  if (score >= 80) return "critical";
  if (score >= 50) return "medium";
  return "low";
}

// L'API renvoie impact_mobilite en LOW / MEDIUM / CRITICAL (ou HIGH en saisie
// manuelle). On se fie d'abord à cette valeur, le score ne sert que de repli.
function resolveSeverity(rawImpact, score) {
  const normalized = (rawImpact ?? "").toString().trim().toUpperCase();
  if (normalized === "CRITICAL" || normalized === "HIGH") return "critical";
  if (normalized === "MEDIUM") return "medium";
  if (normalized === "LOW") return "low";
  return severityFromScore(score);
}

function formatUpdatedAt(date) {
  if (!date) return null;
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const EMPTY_FORM = { evenement: "", duree: "", score: "" };

export default function GvipRiskDashboard() {
  // `zones` contient les données "brutes" (avec rawDuree = texte original
  // renvoyé par l'API). L'affichage réel (duree qui décompte) est calculé
  // séparément dans `displayZones`, recalculé à chaque tick.
  const [zones, setZones] = useState([]);
  const [trackingMap, setTrackingMap] = useState(() => loadTrackingMap());
  const [totalFirebase, setTotalFirebase] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | refreshing | error
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sort, setSort] = useState({ key: "score", dir: "desc" });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0); // force le recalcul des comptes à rebours

  // ---------- Modal "ajouter un événement" ----------
  const [modalZone, setModalZone] = useState(null); // null = fermé, sinon la zone cliquée
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitState, setSubmitState] = useState("idle"); // idle | submitting | success | error
  const [submitError, setSubmitError] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    setStatus((prev) => (silent && prev === "ready" ? "refreshing" : "loading"));
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const rawList = (data.tracked_zones || []).map((z) => {
        const score = Number(z.score_importance) || 0;
        return {
          commune: z.commune || "INCONNUE",
          region: z.region || "INCONNUE",
          evenement: z.evenement_actif || "—",
          rawDuree: z.duree || null,
          score,
          severity: resolveSeverity(z.impact_mobilite, score),
        };
      });

      // On écarte d'abord les zones "placeholder" (événement ou durée = texte
      // du type "EXISTE PAS/AUCUNE MENTION").
      const candidateList = rawList.filter((z) => !isInvalidZone(z));

      // ---- Mise à jour du suivi des comptes à rebours ----
      const now = Date.now();
      const currentTracking = loadTrackingMap();
      const nextTracking = { ...currentTracking };

      candidateList.forEach((z) => {
        const key = trackingKey(z.commune, z.evenement);
        if (!z.rawDuree) return;

        const existing = nextTracking[key];
        // Nouvelle zone, ou texte de durée différent de celui déjà suivi
        // (le backend a mis à jour l'événement) : on (re)démarre le compte
        // à rebours à partir de maintenant.
        if (!existing || existing.rawDuree !== z.rawDuree) {
          const durationMs = parseDureeToMs(z.rawDuree);
          if (durationMs) {
            nextTracking[key] = {
              rawDuree: z.rawDuree,
              expiresAt: new Date(now + durationMs).toISOString(),
            };
          } else {
            // Durée non reconnue : pas de compte à rebours possible.
            delete nextTracking[key];
          }
        }
      });

      // Purge de toutes les échéances déjà dépassées.
      Object.keys(nextTracking).forEach((key) => {
        const expiresAtMs = new Date(nextTracking[key].expiresAt).getTime();
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
          delete nextTracking[key];
        }
      });

      saveTrackingMap(nextTracking);
      setTrackingMap(nextTracking);

      // On masque immédiatement toute zone dont la durée était reconnue mais
      // dont le compte à rebours vient d'être purgé (= déjà expiré).
      const list = candidateList.filter((z) => {
        if (!z.rawDuree) return true;
        const durationMs = parseDureeToMs(z.rawDuree);
        if (!durationMs) return true; // durée non reconnue -> affichée telle quelle, sans expiration
        const key = trackingKey(z.commune, z.evenement);
        return Boolean(nextTracking[key]);
      });

      setZones(list);
      setTotalFirebase(
        typeof data.total_impacted_zones_firebase === "number"
          ? data.total_impacted_zones_firebase
          : null
      );
      setStatus("ready");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Erreur de chargement GVIP:", err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Tick régulier (indépendant du réseau) pour que le texte de durée affiché
  // continue de décompter entre deux rafraîchissements de l'API, et pour
  // masquer en direct une zone dont le compte à rebours vient d'atteindre zéro.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Zones réellement affichées : on y injecte le texte de durée recalculé
  // (qui diminue au fil du temps) et on masque celles dont le compte à
  // rebours est retombé à zéro depuis le dernier chargement réseau.
  const displayZones = useMemo(() => {
    const now = Date.now();
    return zones
      .map((z) => {
        const key = trackingKey(z.commune, z.evenement);
        const tracked = trackingMap[key];
        if (tracked) {
          const remaining = new Date(tracked.expiresAt).getTime() - now;
          if (remaining <= 0) return null; // expiré depuis le dernier fetch -> masqué
          return { ...z, duree: formatMsToDuree(remaining) };
        }
        return { ...z, duree: z.rawDuree || "—" };
      })
      .filter(Boolean);
    // `tick` n'est pas utilisé dans le corps mais force le recalcul périodique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, trackingMap, tick]);

  const counts = useMemo(() => {
    const base = { critical: 0, medium: 0, low: 0 };
    displayZones.forEach((z) => {
      base[z.severity] += 1;
    });
    return base;
  }, [displayZones]);

  const filtered = useMemo(() => {
    let list = displayZones;

    if (severityFilter !== "all") {
      list = list.filter((z) => z.severity === severityFilter);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (z) => z.commune.toLowerCase().includes(q) || z.region.toLowerCase().includes(q)
      );
    }

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === "commune") return a.commune.localeCompare(b.commune) * dir;
      if (sort.key === "duree") {
        return (a.duree || "").localeCompare(b.duree || "") * dir;
      }
      return (a.score - b.score) * dir;
    });
  }, [displayZones, query, severityFilter, sort]);

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "desc" };
    });
  }

  // ---------- Gestion du modal ----------

  function openModal(zone) {
    setModalZone(zone);
    setForm(EMPTY_FORM);
    setSubmitState("idle");
    setSubmitError(null);
  }

  function closeModal() {
    setModalZone(null);
  }

  function handleRowKeyDown(e, zone) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(zone);
    }
  }

  // Aperçu du niveau déduit du score en cours de saisie (affiché en direct
  // sous le champ, avant même l'envoi au backend qui fait le même calcul).
  const scorePreviewSeverity =
    form.score !== "" && !Number.isNaN(Number(form.score))
      ? severityFromScore(Number(form.score))
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!modalZone) return;

    const evenement = form.evenement.trim();
    if (!evenement) {
      setSubmitState("error");
      setSubmitError("Le nom de l'événement est obligatoire.");
      return;
    }

    const scoreNum = Number(form.score);
    if (form.score === "" || Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setSubmitState("error");
      setSubmitError("Le score d'impact doit être un nombre entre 0 et 100.");
      return;
    }

    setSubmitState("submitting");
    setSubmitError(null);

    // Calcul de l'échéance à partir de la durée saisie (ex: "3 jours").
    // Si le texte n'est pas reconnu, on n'envoie pas d'expiration (pas de
    // disparition automatique, l'événement reste affiché indéfiniment).
    const dureeSaisie = form.duree.trim() || null;
    const durationMs = parseDureeToMs(dureeSaisie);
    const expiresAtIso = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;

    try {
      const res = await fetch(MANUAL_EVENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ville_ou_commune: modalZone.commune,
          evenement,
          duree: dureeSaisie,
          score_importance: scoreNum,
          // Champ envoyé en plus pour que le backend/la base de données
          // puisse, si elle le prend en charge, gérer elle-même l'expiration.
          expire_at: expiresAtIso,
        }),
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.detail) detail = errBody.detail;
        } catch {
          // corps de réponse non-JSON, on garde le message HTTP générique
        }
        throw new Error(detail);
      }

      // On enregistre localement l'échéance de ce nouvel événement pour que
      // le dashboard fasse décompter puis disparaître l'événement lui-même,
      // indépendamment de ce que fait (ou non) le backend avec `expire_at`.
      if (expiresAtIso) {
        const key = trackingKey(modalZone.commune, evenement);
        const current = loadTrackingMap();
        const next = {
          ...current,
          [key]: { rawDuree: dureeSaisie, expiresAt: expiresAtIso },
        };
        saveTrackingMap(next);
        setTrackingMap(next);
      }

      setSubmitState("success");
      // On recharge le référentiel en arrière-plan pour refléter le nouvel événement.
      load({ silent: true });
      setTimeout(() => {
        setModalZone(null);
      }, 900);
    } catch (err) {
      console.error("Erreur de saisie manuelle GVIP:", err);
      setSubmitState("error");
      setSubmitError(err.message || "Une erreur est survenue.");
    }
  }

  const totalLabel = totalFirebase ?? displayZones.length;
  const updatedAtLabel = formatUpdatedAt(lastUpdated);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>GVIP MOBILITY INTELLIGENCE</div>
        <h1 className={styles.title}>Zones sous surveillance</h1>
        <p className={styles.subtitle}>
          Communes et départements classés par intensité d'impact sur la mobilité, mis à jour en continu.
        </p>
      </header>

      <section className={styles.statsRow} aria-label="Résumé des zones suivies">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalLabel}</span>
          <span className={styles.statLabel}>Zones suivies</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCritical}`}>
          <span className={styles.statValue}>{counts.critical}</span>
          <span className={styles.statLabel}>Critiques</span>
        </div>
        <div className={`${styles.statCard} ${styles.statMedium}`}>
          <span className={styles.statValue}>{counts.medium}</span>
          <span className={styles.statLabel}>Modérées</span>
        </div>
        <div className={`${styles.statCard} ${styles.statLow}`}>
          <span className={styles.statValue}>{counts.low}</span>
          <span className={styles.statLabel}>Faibles</span>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Rechercher une commune ou une région…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher une zone"
          />
        </div>

        <div className={styles.filterGroup} role="group" aria-label="Filtrer par niveau d'impact">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.filterBtn} ${severityFilter === f.key ? styles.filterBtnActive : ""}`}
              onClick={() => setSeverityFilter(f.key)}
              aria-pressed={severityFilter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.metaWrap}>
          {status === "refreshing" && <span className={styles.refreshingDot} aria-hidden="true" />}
          {updatedAtLabel && (
            <span className={styles.updatedAt}>Mis à jour à {updatedAtLabel}</span>
          )}
          {counts.critical > 0 && (
            <div className={styles.liveTag} aria-live="polite">
              <span className={styles.liveDot} />
              {counts.critical} zone{counts.critical > 1 ? "s" : ""} critique
              {counts.critical > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableCard}>
        {status === "loading" && (
          <div className={styles.stateBlock}>
            <div className={styles.spinner} aria-hidden="true" />
            <p>Connexion au flux GVIP…</p>
          </div>
        )}

        {status === "error" && (
          <div className={styles.stateBlock}>
            <p className={styles.errorTitle}>Impossible de joindre le référentiel</p>
            <p className={styles.errorSubtitle}>
              Vérifiez que l'API est bien démarrée sur <code>{API_URL}</code>.
            </p>
            <button type="button" className={styles.retryBtn} onClick={() => load()}>
              Réessayer
            </button>
          </div>
        )}

        {(status === "ready" || status === "refreshing") && filtered.length === 0 && (
          <div className={styles.stateBlock}>
            <p>Aucune zone ne correspond à ces critères.</p>
          </div>
        )}

        {(status === "ready" || status === "refreshing") && filtered.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thRank} scope="col">
                  #
                </th>
                <th scope="col" aria-sort={sort.key === "commune" ? sort.dir : "none"}>
                  <button
                    type="button"
                    className={styles.sortBtn}
                    onClick={() => toggleSort("commune")}
                  >
                    Commune
                    {sort.key === "commune" && (
                      <span className={styles.sortArrow}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className={styles.thHideMobile} scope="col">
                  Région
                </th>
                <th className={styles.thHideMobile} scope="col">
                  Événement
                </th>
                <th className={styles.thHideMobile} scope="col">
                  <button type="button" className={styles.sortBtn} onClick={() => toggleSort("duree")}>
                    Durée restante
                    {sort.key === "duree" && (
                      <span className={styles.sortArrow}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className={styles.thScore} scope="col" aria-sort={sort.key === "score" ? sort.dir : "none"}>
                  <button type="button" className={styles.sortBtn} onClick={() => toggleSort("score")}>
                    Impact
                    {sort.key === "score" && (
                      <span className={styles.sortArrow}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((z, i) => (
                <tr
                  key={`${z.commune}-${i}`}
                  className={`${styles.row} ${styles.rowClickable}`}
                  style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  onClick={() => openModal(z)}
                  onKeyDown={(e) => handleRowKeyDown(e, z)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ajouter un événement pour ${z.commune}`}
                >
                  <td className={styles.rank} data-label="#">
                    {i + 1}
                  </td>
                  <td className={styles.commune} data-label="Commune">
                    {z.commune}
                  </td>
                  <td className={styles.thHideMobile} data-label="Région">
                    {z.region}
                  </td>
                  <td className={`${styles.thHideMobile} ${styles.event}`} data-label="Événement">
                    {z.evenement}
                  </td>
                  <td className={styles.thHideMobile} data-label="Durée">
                    <span className={styles.dureeValue}>{z.duree || "—"}</span>
                  </td>
                  <td data-label="Impact">
                    <div className={styles.impactCell}>
                      <div className={styles.barTrack}>
                        <div
                          className={`${styles.barFill} ${styles[z.severity]}`}
                          style={{ width: `${Math.min(z.score, 100)}%` }}
                        />
                      </div>
                      <span className={`${styles.scoreValue} ${styles[z.severity]}`}>{z.score}</span>
                      <span className={`${styles.badge} ${styles[z.severity]}`}>
                        {SEVERITY_LABEL[z.severity]}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalZone && (
        <div
          className={styles.modalOverlay}
          onClick={closeModal}
          role="presentation"
        >
          <div
            className={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gvip-modal-title"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeModal}
              aria-label="Fermer"
            >
              ×
            </button>

            <div className={styles.modalEyebrow}>SAISIE MANUELLE</div>
            <h2 id="gvip-modal-title" className={styles.modalTitle}>
              {modalZone.commune}
            </h2>
            <p className={styles.modalSubtitle}>{modalZone.region}</p>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <label className={styles.formLabel} htmlFor="gvip-evenement">
                Événement <span className={styles.required}>*</span>
              </label>
              <input
                id="gvip-evenement"
                type="text"
                className={styles.formInput}
                placeholder="Ex : manifestation, route coupée…"
                value={form.evenement}
                onChange={(e) => setForm((f) => ({ ...f, evenement: e.target.value }))}
                disabled={submitState === "submitting" || submitState === "success"}
                required
              />

              <label className={styles.formLabel} htmlFor="gvip-duree">
                Durée estimée
              </label>
              <input
                id="gvip-duree"
                type="text"
                className={styles.formInput}
                placeholder="Ex : 3 jours, 12 heures, 1 semaine…"
                value={form.duree}
                onChange={(e) => setForm((f) => ({ ...f, duree: e.target.value }))}
                disabled={submitState === "submitting" || submitState === "success"}
              />
              <p className={styles.formHint}>
                Si une durée reconnue est indiquée, le temps restant affiché diminuera
                automatiquement et l'événement disparaîtra du tableau une fois ce délai passé.
              </p>

              <label className={styles.formLabel} htmlFor="gvip-score">
                Score d'impact (0-100) <span className={styles.required}>*</span>
              </label>
              <input
                id="gvip-score"
                type="number"
                min="0"
                max="100"
                step="1"
                className={styles.formInput}
                placeholder="Ex : 75"
                value={form.score}
                onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                disabled={submitState === "submitting" || submitState === "success"}
                required
              />
              {scorePreviewSeverity && (
                <p className={styles.formHint}>
                  Niveau déduit :{" "}
                  <span className={`${styles.badge} ${styles[scorePreviewSeverity]}`}>
                    {SEVERITY_LABEL[scorePreviewSeverity]}
                  </span>
                </p>
              )}

              {submitState === "error" && submitError && (
                <p className={styles.formError}>{submitError}</p>
              )}
              {submitState === "success" && (
                <p className={styles.formSuccess}>Événement enregistré ✅</p>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={closeModal}
                  disabled={submitState === "submitting"}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={submitState === "submitting" || submitState === "success"}
                >
                  {submitState === "submitting" ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
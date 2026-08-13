import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./GvipRiskDashboard.module.css";

// Endpoint FastAPI exposé par main.py (/api/referentiel/statut)
const API_URL =
  import.meta.env?.VITE_GVIP_API_URL ||
  "https://fastapi-backend-go.vercel.app/api/referentiel/statut";

const API_BASE_URL = API_URL.replace(/\/api\/referentiel\/statut\/?$/, "");
const MANUAL_EVENT_URL = `${API_BASE_URL}/api/evenements/manuel`;

const REFRESH_INTERVAL_MS = 30000; // Rafraîchissement des données depuis l'API
const TICK_INTERVAL_MS = 30000; // Recalcul visuel des comptes à rebours (sans appel réseau)

const SEVERITY_LABEL = {
  critical: "Critique",
  medium: "Modéré",
  low: "Faible",
};

const SEVERITY_FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "critical", label: "Critique" },
  { key: "medium", label: "Modéré" },
  { key: "low", label: "Faible" },
];

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

function isInvalidZone(zone) {
  return isInvalidValue(zone.evenement) || isInvalidValue(zone.rawDuree);
}

// ---------------------------------------------------------------------------
// Compte à rebours — désormais basé sur `expire_at` renvoyé par le backend
// (calculé et stocké une seule fois côté serveur), et non plus recalculé
// localement à partir du texte de durée. Ça évite tout redémarrage du
// compteur si le texte de l'événement change légèrement d'un rafraîchissement
// à l'autre, et garantit que tous les visiteurs voient le même temps restant.
// ---------------------------------------------------------------------------
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

function severityFromScore(score) {
  if (score >= 80) return "critical";
  if (score >= 50) return "medium";
  return "low";
}

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
  const [zones, setZones] = useState([]);
  const [totalFirebase, setTotalFirebase] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | refreshing | error
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sort, setSort] = useState({ key: "score", dir: "desc" });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0);

  const [modalZone, setModalZone] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitState, setSubmitState] = useState("idle");
  const [submitError, setSubmitError] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    setStatus((prev) => (silent && prev === "ready" ? "refreshing" : "loading"));
    try {
      // cache: "no-store" force une vraie requête réseau à chaque fois —
      // sans ça, le tableau pouvait rester bloqué sur une ancienne réponse
      // mise en cache par le navigateur.
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const rawList = (data.tracked_zones || [])
        .map((z) => {
          const score = Number(z.score_importance) || 0;
          return {
            commune: z.commune || "INCONNUE",
            region: z.region || "INCONNUE",
            evenement: z.evenement_actif || "—",
            rawDuree: z.duree || null,
            expireAt: z.expire_at || null, // source de vérité pour le décompte
            score,
            severity: resolveSeverity(z.impact_mobilite, score),
            // Conséquence probable + suggestion de contournement, déduites
            // par Claude ou par le dictionnaire de secours côté backend
            // (voir Services/consequencesEvenement.py).
            consequence: z.consequence || "",
            suggestion: z.suggestion || "",
            // Communes/départements voisins potentiellement impactés par
            // ricochet (trafic dévié, affluence reportée, etc.).
            villesVoisinesImpactees: Array.isArray(z.villes_voisines_impactees)
              ? z.villes_voisines_impactees
              : [],
          };
        })
        .filter((z) => !isInvalidZone(z));

      setZones(rawList);
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

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const displayZones = useMemo(() => {
    const now = Date.now();
    return zones.map((z) => {
      if (z.expireAt) {
        const remainingMs = new Date(z.expireAt).getTime() - now;
        return {
          ...z,
          duree: remainingMs > 0 ? formatMsToDuree(remainingMs) : null,
          remainingMs,
        };
      }
      return { ...z, duree: z.rawDuree || "—", remainingMs: Infinity };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, tick]);

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
        return (a.remainingMs - b.remainingMs) * dir;
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

    const dureeSaisie = form.duree.trim() || null;

    try {
      const res = await fetch(MANUAL_EVENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ville_ou_commune: modalZone.commune,
          evenement,
          duree: dureeSaisie,
          score_importance: scoreNum,
          // expire_at n'est plus calculé côté client : le backend s'en charge.
          expire_at: null,
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

      setSubmitState("success");
      // Rechargement immédiat (pas "silent") pour voir tout de suite le
      // nouvel événement, avec son expire_at et sa conséquence/suggestion
      // calculés par le backend.
      load();
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
  const hasImpactInfo =
    modalZone &&
    (modalZone.consequence || modalZone.suggestion || modalZone.villesVoisinesImpactees?.length > 0);

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
                  aria-label={`Voir les détails et ajouter un événement pour ${z.commune}`}
                >
                  <td className={styles.rank} data-label="#">
                    {i + 1}
                  </td>
                  <td className={styles.commune} data-label="Commune">
                    {z.commune}
                    {z.villesVoisinesImpactees.length > 0 && (
                      <span
                        className={styles.neighborsHint}
                        title={`Communes voisines potentiellement impactées : ${z.villesVoisinesImpactees.join(", ")}`}
                      >
                        +{z.villesVoisinesImpactees.length}
                      </span>
                    )}
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
        <div className={styles.modalOverlay} onClick={closeModal} role="presentation">
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

            <div className={styles.modalEyebrow}>
              {hasImpactInfo ? "ANALYSE D'IMPACT" : "SAISIE MANUELLE"}
            </div>
            <h2 id="gvip-modal-title" className={styles.modalTitle}>
              {modalZone.commune}
            </h2>
            <p className={styles.modalSubtitle}>{modalZone.region}</p>

            {hasImpactInfo && (
              <div className={styles.impactPanel}>
                {modalZone.evenement && modalZone.evenement !== "—" && (
                  <p className={styles.impactEvent}>{modalZone.evenement}</p>
                )}
                {modalZone.consequence && (
                  <div className={styles.impactRow}>
                    <span className={styles.impactLabel}>Conséquence probable</span>
                    <p className={styles.impactText}>{modalZone.consequence}</p>
                  </div>
                )}
                {modalZone.suggestion && (
                  <div className={styles.impactRow}>
                    <span className={styles.impactLabel}>Suggestion</span>
                    <p className={styles.impactText}>{modalZone.suggestion}</p>
                  </div>
                )}
                {modalZone.villesVoisinesImpactees.length > 0 && (
                  <div className={styles.impactRow}>
                    <span className={styles.impactLabel}>Communes voisines potentiellement impactées</span>
                    <div className={styles.neighborsList}>
                      {modalZone.villesVoisinesImpactees.map((ville) => (
                        <span key={ville} className={styles.neighborChip}>
                          {ville}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalDivider} />
            <div className={styles.modalSectionLabel}>Ajouter / mettre à jour un événement</div>

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
                La conséquence et la suggestion de contournement seront déduites automatiquement
                du texte de l'événement.
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
                  {submitState === "submitting" ? "Analyse en cours…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
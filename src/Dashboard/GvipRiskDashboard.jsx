import { useEffect, useMemo, useState } from "react";
import styles from "./GvipRiskDashboard.module.css";

// Endpoint FastAPI exposé par main.py (/api/referentiel/statut)
// ⚠️ En prod, VITE_GVIP_API_URL doit être défini dans les Environment Variables
// du projet Vercel du FRONTEND (pas celui du backend), sinon on retombe sur
// l'URL de déploiement backend en dur ci-dessous.
const API_URL =
  import.meta.env?.VITE_GVIP_API_URL ||
  "https://fastapi-backend-go.vercel.app/api/referentiel/statut";

function severityFromScore(score) {
  if (score >= 80) return "critical";
  if (score >= 50) return "medium";
  return "low";
}

const SEVERITY_LABEL = {
  critical: "Critique",
  medium: "Modéré",
  low: "Faible",
};

export default function GvipRiskDashboard() {
  const [zones, setZones] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const list = (data.tracked_zones || []).map((z) => ({
          commune: z.commune || "INCONNUE",
          region: z.region || "INCONNUE",
          evenement: z.evenement_actif || "—",
          score: Number(z.score_importance) || 0,
          impact: (z.impact_mobilite || severityFromScore(z.score_importance)).toString().toLowerCase(),
        }));

        list.sort((a, b) => b.score - a.score);
        setZones(list);
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          console.error("Erreur de chargement GVIP:", err);
          setStatus("error");
        }
      }
    }

    load();
    const interval = setInterval(load, 30000); // rafraîchissement temps quasi-réel
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return zones;
    const q = query.trim().toLowerCase();
    return zones.filter(
      (z) => z.commune.toLowerCase().includes(q) || z.region.toLowerCase().includes(q)
    );
  }, [zones, query]);

  const criticalCount = zones.filter((z) => severityFromScore(z.score) === "critical").length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>GVIP MOBILITY INTELLIGENCE</div>
        <h1 className={styles.title}>Zones sous surveillance</h1>
        <p className={styles.subtitle}>
          Communes et départements classés par intensité d'impact sur la mobilité, mis à jour en continu.
        </p>
      </header>

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
        {status === "ready" && (
          <div className={styles.liveTag}>
            <span className={styles.liveDot} />
            {criticalCount} zone{criticalCount > 1 ? "s" : ""} critique{criticalCount > 1 ? "s" : ""}
          </div>
        )}
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
          </div>
        )}

        {status === "ready" && filtered.length === 0 && (
          <div className={styles.stateBlock}>
            <p>Aucune zone ne correspond à cette recherche.</p>
          </div>
        )}

        {status === "ready" && filtered.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thRank}>#</th>
                <th>Commune</th>
                <th className={styles.thHideMobile}>Région</th>
                <th className={styles.thHideMobile}>Événement</th>
                <th className={styles.thScore}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((z, i) => {
                const severity = severityFromScore(z.score);
                return (
                  <tr key={`${z.commune}-${i}`} className={styles.row}>
                    <td className={styles.rank}>{i + 1}</td>
                    <td className={styles.commune}>{z.commune}</td>
                    <td className={styles.thHideMobile}>{z.region}</td>
                    <td className={`${styles.thHideMobile} ${styles.event}`}>{z.evenement}</td>
                    <td>
                      <div className={styles.impactCell}>
                        <div className={styles.barTrack}>
                          <div
                            className={`${styles.barFill} ${styles[severity]}`}
                            style={{ width: `${Math.min(z.score, 100)}%` }}
                          />
                        </div>
                        <span className={`${styles.scoreValue} ${styles[severity]}`}>
                          {z.score}
                        </span>
                        <span className={`${styles.badge} ${styles[severity]}`}>
                          {SEVERITY_LABEL[severity]}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
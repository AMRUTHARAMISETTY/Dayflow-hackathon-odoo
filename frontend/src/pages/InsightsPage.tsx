import { useEffect, useState } from "react";
import { fetchAttritionRisk, fetchHeadcountTrend } from "../lib/api";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { AttritionRiskEntry, HeadcountPoint } from "../lib/types";

export function InsightsPage() {
  const [trend, setTrend] = useState<HeadcountPoint[] | null>(null);
  const [risk, setRisk] = useState<AttritionRiskEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    Promise.all([fetchHeadcountTrend(), fetchAttritionRisk()])
      .then(([t, r]) => { setTrend(t); setRisk(r); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load workforce insights."));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!trend || !risk) return <LoadingSkeleton rows={4} kind="card" />;

  const maxHeadcount = Math.max(...trend.map((p) => p.headcount), 1);

  return (
    <div className="grid-two">
      <div className="panel">
        <h3>Headcount trend</h3>
        <p className="empty-inline" style={{ marginBottom: 12 }}>
          Active roster by join month, with a simple trend projection for the next 2 months (average of the last 3
          months' net change) — not a machine-learning forecast.
        </p>
        <div className="department-bars">
          {trend.map((point) => (
            <div key={point.period} className="department-bar">
              <div className="bar-label"><span>{point.period}{point.projected ? " (projected)" : ""}</span><span>{point.headcount}</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(point.headcount / maxHeadcount) * 100}%`, opacity: point.projected ? 0.5 : 1 }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Attrition risk signals</h3>
        <p className="empty-inline" style={{ marginBottom: 12 }}>
          Rule-based flags from real attendance/leave/tenure data (no leave taken in 90 days, frequent lateness, no
          manager assigned, very new hire) — not a predictive model.
        </p>
        {risk.length === 0 ? <EmptyState title="No risk signals right now" description="Nobody currently matches a risk rule." /> : (
          <div className="attention-list">
            {risk.map((entry) => (
              <div key={entry.employeeId} className="attention-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{entry.employeeName}</strong>
                  <span className={`severity-pill ${entry.riskLevel === "HIGH" ? "critical" : entry.riskLevel === "MEDIUM" ? "due-today" : "informational"}`}>
                    {entry.riskLevel}
                  </span>
                </div>
                <span className="meta">{entry.departmentName ?? "—"} &middot; score {entry.riskScore}</span>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-muted)" }}>
                  {entry.signals.map((signal) => <li key={signal}>{signal}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

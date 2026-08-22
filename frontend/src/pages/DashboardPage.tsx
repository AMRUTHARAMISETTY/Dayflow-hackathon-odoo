import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboard } from "../lib/api";
import { ErrorState, LoadingSkeleton, StaleDataBanner } from "../components/StateViews";
import type { DashboardSummary } from "../lib/types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [stale, setStale] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchDashboard()
      .then((result) => {
        setSummary(result.data);
        setStale(result.stale);
        setAsOf(result.asOf);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the dashboard."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading && !summary) {
    return (
      <>
        <div className="kpi-grid">
          <LoadingSkeleton rows={8} kind="card" />
        </div>
      </>
    );
  }
  if (error && !summary) return <ErrorState message={error} onRetry={load} />;
  if (!summary) return null;

  return (
    <>
      {stale && <StaleDataBanner asOf={asOf} />}
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>{summary.greeting}</p>

      <div className="kpi-grid">
        {summary.kpis.map((kpi) => (
          <div
            key={kpi.key}
            className={`kpi-card ${kpi.available ? "clickable" : "unavailable"}`}
            role={kpi.available && kpi.href ? "button" : undefined}
            tabIndex={kpi.available && kpi.href ? 0 : undefined}
            onClick={() => kpi.available && kpi.href && navigate(kpi.href)}
            onKeyDown={(event) => {
              if (kpi.available && kpi.href && (event.key === "Enter" || event.key === " ")) navigate(kpi.href);
            }}
          >
            <span className="kpi-label">{kpi.label}</span>
            <span className="kpi-value">{kpi.available ? kpi.value ?? "—" : "Not yet available"}</span>
            {kpi.note && <span className="kpi-note">{kpi.note}</span>}
          </div>
        ))}
      </div>

      <div className="grid-two">
        <div className="panel">
          <h3>Needs your attention</h3>
          {summary.needsAttention.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Nothing urgent right now.</p>
          ) : (
            <div className="attention-list">
              {summary.needsAttention.map((item, index) => (
                <div className="attention-item" key={index}>
                  <div>
                    <span className={`severity-pill ${item.severity.toLowerCase().replace(/\s+/g, "-")}`}>{item.severity}</span>
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{item.title}</div>
                    <div className="meta">{item.detail}</div>
                  </div>
                  <button className="secondary" onClick={() => navigate(item.href)}>{item.actionLabel}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Department breakdown</h3>
          {summary.departmentBreakdown.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Visible to HR roles with directory access.</p>
          ) : (
            <div className="department-bars">
              {summary.departmentBreakdown.map((row) => {
                const max = Math.max(...summary.departmentBreakdown.map((r) => r.activeCount), 1);
                return (
                  <div className="department-bar" key={row.department}>
                    <div className="bar-label"><span>{row.department}</span><span>{row.activeCount}</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(row.activeCount / max) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="section-heading">
        <h2>Next 7 days</h2>
      </div>
      <div className="panel" style={{ marginBottom: 8 }}>
        {!summary.canViewAvailability ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Leave access is required to view team availability.</p>
        ) : summary.upcomingLeave.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Everyone in scope is available this week.</p>
        ) : (
          <div className="activity-list">
            {summary.upcomingLeave.map((item, index) => (
              <div className="activity-row" key={index}>
                <span><span className="actor">{item.employeeName}</span> · {item.leaveTypeName}</span>
                <span>{new Date(item.startDate).toLocaleDateString()} – {new Date(item.endDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-heading">
        <h2>Recent activity</h2>
        <span className="muted">Last synchronized {new Date(summary.lastSynchronizedAt).toLocaleTimeString()}</span>
      </div>
      <div className="panel">
        {!summary.canViewActivity ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Audit access is required to view recent activity.</p>
        ) : summary.recentActivity.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No activity recorded yet.</p>
        ) : (
          <div className="activity-list">
            {summary.recentActivity.map((row, index) => (
              <div className="activity-row" key={index}>
                <span><span className="actor">{row.actor}</span> · {row.action.replace(/_/g, " ").toLowerCase()} · {row.entity}</span>
                <time>{new Date(row.createdAt).toLocaleString()}</time>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

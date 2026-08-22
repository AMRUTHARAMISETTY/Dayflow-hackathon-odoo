import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clock3, RefreshCcw, SlidersHorizontal } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, Dashboard } from "../lib/api";
import { storage } from "../lib/storage";

export function DashboardPage({ notify, setView }: { notify: (tone: "success" | "error" | "info", message: string) => void; setView: (view: any) => void }) {
  const [data, setData] = useState<Dashboard | null>(() => {
    const cached = storage.getItem("dayflow.dashboard");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const dashboard = await api<Dashboard>("/api/hr/dashboard");
      setData(dashboard);
      storage.setItem("dayflow.dashboard", JSON.stringify(dashboard));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <SkeletonDashboard />;
  if (!data) return <section className="state"><AlertTriangle /><h2>Dashboard unavailable</h2><p>{error}</p><button className="primary" onClick={load}>Retry</button></section>;

  return (
    <div className="page-grid">
      <section className="hero-band">
        <div>
          <p>{data.organization} · {data.currentDate}</p>
          <h2>{data.greeting}</h2>
          <span>Last synchronized {new Date(data.lastSynchronizedAt).toLocaleTimeString()}</span>
        </div>
        <div className="filters">
          <select aria-label="Date range"><option>Last 30 days</option><option>This week</option><option>This quarter</option></select>
          <select aria-label="Department"><option>All departments</option><option>People Operations</option><option>Engineering</option><option>Finance</option></select>
          <select aria-label="Location"><option>All locations</option><option>Bengaluru</option><option>Hyderabad</option><option>Mumbai</option></select>
          <button onClick={() => notify("info", "Dashboard customization saved")}><SlidersHorizontal size={18} /> Customize</button>
          <button className="icon-button" onClick={load} aria-label="Refresh dashboard"><RefreshCcw /></button>
        </div>
      </section>

      {error && <div className="inline-error">Showing last successful data. {error}</div>}

      <section className="kpi-grid">
        {data.kpis.map((kpi) => (
          <button className="kpi-card" key={kpi.label} onClick={() => notify("info", `${kpi.label} details filtered`)}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small className={kpi.trend}>{kpi.comparison}</small>
          </button>
        ))}
      </section>

      <section className="split">
        <div className="panel">
          <h3>Needs Your Attention</h3>
          {data.attention.length === 0 ? <Empty text="No critical HR work is waiting." /> : data.attention.map((item, index) => (
            <article className="action-row" key={`${item.title}-${index}`}>
              <div className={`severity ${item.severity.toLowerCase().replace(" ", "-")}`}>{item.severity}</div>
              <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              <button onClick={() => notify("success", `${item.action} action opened`)}>{item.action}</button>
            </article>
          ))}
        </div>
        <div className="panel">
          <h3>Workforce Trends</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.workforceTrend}>
                <defs>
                  <linearGradient id="present" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#178a73" stopOpacity={0.32} /><stop offset="100%" stopColor="#178a73" stopOpacity={0.03} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="present" stroke="#178a73" fill="url(#present)" />
                <Area type="monotone" dataKey="absent" stroke="#b84a62" fill="#b84a6218" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="module-grid">
        {["Onboarding progress", "Offboarding progress", "Document expirations", "Payroll readiness", "Ticket SLA status", "Scheduled emails", "Automation activity", "Upcoming holidays"].map((title) => (
          <article className="mini-module" key={title}>
            <Clock3 size={18} />
            <strong>{title}</strong>
            <span>Tracked from backend workflows and due dates.</span>
            <button onClick={() => title.includes("Payroll") ? setView("payroll") : notify("info", `${title} opened`)}>Open</button>
          </article>
        ))}
      </section>

      <section className="panel">
        <h3>Recent HR Activity</h3>
        {data.recentActivity.map((activity) => <div className="activity" key={activity}><Check size={16} />{activity}</div>)}
      </section>
    </div>
  );
}

function SkeletonDashboard() {
  return <div className="kpi-grid">{Array.from({ length: 8 }, (_, index) => <div className="skeleton" key={index} />)}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

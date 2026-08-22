import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  WalletCards,
  Workflow,
  X
} from "lucide-react";
import { api, AppUser, login } from "./lib/api";
import { storage } from "./lib/storage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { OperationsPage } from "./pages/OperationsPage";

type View = "overview" | "employees" | "approvals" | "payroll" | "email" | "tickets" | "automation" | "audit";
type Toast = { id: number; tone: "success" | "error" | "info"; message: string };

const navGroups = [
  { label: "Workspace", items: [["overview", "Overview", LayoutDashboard], ["approvals", "My Tasks", CheckCircle2], ["overview", "Calendar", CalendarDays], ["overview", "Notifications", Bell]] },
  { label: "People", items: [["employees", "Employees", Users], ["employees", "Organization Chart", BriefcaseBusiness], ["employees", "Onboarding", Sparkles], ["employees", "Documents", FileText]] },
  { label: "Finance", items: [["payroll", "Payroll", WalletCards], ["payroll", "Payroll Exceptions", ShieldCheck]] },
  { label: "Communication", items: [["email", "HR Email", Mail], ["email", "Email Templates", Mail]] },
  { label: "Employee Experience", items: [["tickets", "HR Help Desk", LifeBuoy]] },
  { label: "Administration", items: [["automation", "Workflow Builder", Workflow], ["audit", "Audit Logs", Settings]] }
] as const;

const permissionByView: Record<View, string> = {
  overview: "dashboard:read",
  employees: "employee:read",
  approvals: "approval:read",
  payroll: "payroll:read",
  email: "email:write",
  tickets: "ticket:read",
  automation: "automation:read",
  audit: "audit:read"
};

export function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [view, setView] = useState<View>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const token = storage.getItem("dayflow.token");
    if (token) api<AppUser>("/api/auth/me").then(setUser).catch(() => storage.removeItem("dayflow.token"));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const notify = (tone: Toast["tone"], message: string) => {
    const id = Date.now();
    setToasts((items) => [...items, { id, tone, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  };

  if (!user) return <LoginScreen onLogin={setUser} notify={notify} />;

  const can = (target: View) => user.permissions.includes(permissionByView[target]);
  const visibleGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter(([target]) => can(target as View))
  })).filter((group) => group.items.length > 0);

  const content = (
    <PortalContent
      view={view}
      user={user}
      notify={notify}
      setView={setView}
    />
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <Brand collapsed={sidebarCollapsed} />
        <button className="icon-button collapse" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle sidebar">
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
        <Navigation groups={visibleGroups} view={view} setView={(next) => setView(next)} collapsed={sidebarCollapsed} />
      </aside>

      <div className="mobile-bar">
        <button className="icon-button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><Menu /></button>
        <Brand collapsed={false} />
      </div>

      {drawerOpen && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setDrawerOpen(false)}>
          <nav className="drawer" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation"><X /></button>
            <Navigation groups={visibleGroups} view={view} setView={(next) => { setView(next); setDrawerOpen(false); }} collapsed={false} />
          </nav>
        </div>
      )}

      <main className="workspace">
        <header className="topbar">
          <div>
            <div className="breadcrumbs">Dayflow / {labelFor(view)}</div>
            <h1>{labelFor(view)}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search">
              <Search size={18} />
              <input aria-label="Global search" placeholder="Search people, tasks, policies" onKeyDown={(event) => {
                if (event.key === "Enter") notify("info", `Search queued for "${event.currentTarget.value}"`);
              }} />
            </label>
            <select aria-label="Quick create" onChange={(event) => {
              if (event.target.value) notify("success", `${event.target.value} flow opened`);
              event.target.value = "";
            }}>
              <option value="">Quick Create</option>
              <option>Employee</option>
              <option>Announcement</option>
              <option>HR Ticket</option>
              <option>Automation Rule</option>
            </select>
            <button className="icon-button" onClick={() => notify("info", "Notification center refreshed")} aria-label="Notifications"><Bell /></button>
            <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
            <div className="profile">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>
        </header>
        <div className={`connection ${online ? "online" : "offline"}`}>{online ? "Online" : "Offline: last loaded data remains visible"}</div>
        {content}
      </main>

      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => <div className={`toast ${toast.tone}`} key={toast.id}>{toast.message}</div>)}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, notify }: { onLogin: (user: AppUser) => void; notify: (tone: Toast["tone"], message: string) => void }) {
  const [email, setEmail] = useState("admin@dayflow.test");
  const [password, setPassword] = useState("Dayflow@123");
  const [loading, setLoading] = useState(false);
  return (
    <main className="login">
      <section className="login-panel">
        <div className="brand-mark">D</div>
        <h1>Dayflow</h1>
        <p>Every workday, perfectly aligned.</p>
        <form onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          try {
            onLogin(await login(email, password));
            notify("success", "Signed in securely");
          } catch (error) {
            notify("error", error instanceof Error ? error.message : "Login failed");
          } finally {
            setLoading(false);
          }
        }}>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
          <button className="primary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
      </section>
    </main>
  );
}

function PortalContent({ view, user, notify, setView }: { view: View; user: AppUser; notify: (tone: Toast["tone"], message: string) => void; setView: (view: View) => void }) {
  if (!user.permissions.includes(permissionByView[view])) return <Denied />;
  if (view === "overview") return <DashboardPage notify={notify} setView={setView} />;
  if (view === "employees") return <EmployeesPage notify={notify} />;
  return <OperationsPage view={view} notify={notify} permissions={user.permissions} />;
}

function Navigation({ groups, view, setView, collapsed }: { groups: { label: string; items: readonly (readonly [string, string, typeof LayoutDashboard])[] }[]; view: View; setView: (view: View) => void; collapsed: boolean }) {
  return (
    <div className="nav-groups">
      {groups.map((group) => (
        <section key={group.label}>
          {!collapsed && <p>{group.label}</p>}
          {group.items.map(([target, label, Icon]) => (
            <button key={`${group.label}-${label}`} className={view === target ? "active" : ""} onClick={() => setView(target as View)} title={label}>
              <Icon size={19} />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return <div className="brand"><div className="brand-mark">D</div>{!collapsed && <div><strong>Dayflow</strong><span>HR Command</span></div>}</div>;
}

function Denied() {
  return <section className="state"><ShieldCheck /><h2>Access restricted</h2><p>Your current role does not include this permission. Ask a Super Admin to adjust access.</p></section>;
}

function labelFor(view: View) {
  return ({
    overview: "Overview",
    employees: "Employees",
    approvals: "Approvals",
    payroll: "Payroll Exceptions",
    email: "HR Email",
    tickets: "HR Help Desk",
    automation: "Automation Rules",
    audit: "Audit Logs"
  } satisfies Record<View, string>)[view];
}

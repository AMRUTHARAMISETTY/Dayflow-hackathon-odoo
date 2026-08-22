import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, CheckCheck, ChevronLeft, ChevronRight, LogOut, Menu, Moon, Search, ShieldQuestion, Sun, User, X
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useNotifications } from "../lib/notifications-context";
import { useToast } from "../lib/toast-context";
import { navGroups } from "./navigation";

const THEME_KEY = "dayflow.theme";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { unreadCount, recent, markRead, markAllRead } = useNotifications();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!user) return null;

  const can = (permission?: string) => !permission || user.permissions.includes(permission);
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.built || can(item.permission)) }))
    .filter((group) => group.items.length > 0);

  const activeItem = navGroups.flatMap((g) => g.items).find((item) => item.path === location.pathname);
  const title = activeItem?.label ?? (location.pathname.startsWith("/employees/") ? "Employee Profile" : location.pathname.startsWith("/accept-invitation") ? "Accept Invitation" : "Dayflow");

  const runQuickCreate = (value: string) => {
    if (value === "employee") navigate("/employees?create=1");
    else if (value === "invitation") navigate("/invitations?create=1");
    else if (value === "leave") navigate("/leave?request=1");
    else if (value) notify("info", `${value[0].toUpperCase()}${value.slice(1)} creation arrives in a later phase.`);
  };

  const nav = (
    <div className="nav-groups">
      {visibleGroups.map((group) => (
        <section key={group.label}>
          {!collapsed && <p className="group-label">{group.label}</p>}
          {group.items.map((item) => {
            const Icon = item.icon;
            if (!item.built) {
              return (
                <button key={item.label} className="nav-item disabled" disabled title={`${item.label} — ${item.phaseNote}`}>
                  <Icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && <span className="phase-badge">{item.phaseNote}</span>}
                </button>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={() => setDrawerOpen(false)}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="brand"><Brand /></div>
        <button className="icon-button collapse-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {nav}
      </aside>

      <div className="mobile-bar">
        <button className="icon-button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><Menu /></button>
        <Brand />
      </div>
      {drawerOpen && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setDrawerOpen(false)}>
          <nav className="drawer" aria-label="Navigation" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation"><X /></button>
            {nav}
          </nav>
        </div>
      )}

      <div className="workspace">
        <header className="topbar">
          <div>
            <div className="breadcrumbs">Dayflow / {title}</div>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="Global search"
                placeholder="Search employees…"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && event.currentTarget.value.trim()) {
                    navigate(`/employees?q=${encodeURIComponent(event.currentTarget.value.trim())}`);
                  }
                }}
              />
            </label>
            <select className="quick-create" aria-label="Quick create" value="" onChange={(event) => { runQuickCreate(event.target.value); event.target.value = ""; }}>
              <option value="">Quick create</option>
              {user.permissions.includes("employee:write") && <option value="employee">Employee</option>}
              {user.permissions.includes("invitation:write") && <option value="invitation">Invitation</option>}
              {user.permissions.includes("leave:request") && <option value="leave">Leave request</option>}
              <option value="announcement">Announcement</option>
              <option value="task">Task</option>
            </select>
            <div className="profile-menu">
              <button className="icon-button" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`} onClick={() => setNotificationsOpen((v) => !v)} style={{ position: "relative" }}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <div className="dropdown-menu notification-dropdown" role="menu">
                  <div className="notification-dropdown-header">
                    <strong>Notifications</strong>
                    {unreadCount > 0 && (
                      <button className="link" onClick={() => markAllRead()}><CheckCheck size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Mark all read</button>
                    )}
                  </div>
                  {recent.length === 0 ? (
                    <div style={{ padding: "10px 10px 4px", fontSize: 13, color: "var(--text-muted)" }}>
                      No notifications yet.
                    </div>
                  ) : (
                    <div className="notification-list">
                      {recent.map((n) => (
                        <button
                          key={n.id}
                          className={`notification-item ${n.readAt ? "" : "unread"}`}
                          onClick={() => {
                            if (!n.readAt) markRead(n.id);
                            setNotificationsOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                        >
                          <span className={`severity-dot ${n.severity.toLowerCase()}`} />
                          <span>
                            <span className="notification-title">{n.title}</span>
                            <span className="notification-body">{n.body}</span>
                            <span className="notification-time">{new Date(n.createdAt).toLocaleString()}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="profile-menu">
              <button className="profile-trigger" onClick={() => setProfileOpen((v) => !v)} aria-haspopup="menu" aria-expanded={profileOpen}>
                <span className="avatar">{initials(user.name)}</span>
                <span className="who"><strong>{user.name}</strong><span>{formatRole(user.role)}</span></span>
              </button>
              {profileOpen && (
                <div className="dropdown-menu" role="menu">
                  <button role="menuitem" onClick={() => { setProfileOpen(false); navigate(`/employees/${user.employeeId}`); }}>
                    <User size={14} style={{ marginRight: 8 }} /> My profile
                  </button>
                  <button role="menuitem" onClick={() => { setProfileOpen(false); notify("info", "Help center arrives in a later phase."); }}>
                    <ShieldQuestion size={14} style={{ marginRight: 8 }} /> Help
                  </button>
                  <div className="divider" />
                  <button role="menuitem" onClick={() => logout()}>
                    <LogOut size={14} style={{ marginRight: 8 }} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {!online && <div className="connection-banner offline" role="status">You're offline. Dayflow will keep showing the last data it loaded.</div>}
        <div className="page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <>
      <div className="brand-mark">D</div>
      <div><strong>Dayflow</strong><span>HR Command</span></div>
    </>
  );
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

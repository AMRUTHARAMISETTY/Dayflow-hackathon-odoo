import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck } from "lucide-react";
import { useNotifications } from "../lib/notifications-context";
import { EmptyState } from "../components/StateViews";

export function NotificationsPage() {
  const { recent, unreadCount, loading, markRead, markAllRead, refresh } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const visible = filter === "unread" ? recent.filter((n) => !n.readAt) : recent;

  return (
    <>
      <div className="toolbar">
        <select value={filter} onChange={(event) => setFilter(event.target.value as "all" | "unread")} aria-label="Filter">
          <option value="all">All</option>
          <option value="unread">Unread</option>
        </select>
        <div className="spacer" />
        {unreadCount > 0 && (
          <button className="secondary" onClick={() => markAllRead()}>
            <CheckCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Mark all read
          </button>
        )}
        <button className="secondary" onClick={() => refresh()}>Refresh</button>
      </div>

      {!loading && visible.length === 0 && <EmptyState title={filter === "unread" ? "No unread notifications" : "No notifications yet"} />}

      <div className="panel">
        <div className="notification-list">
          {visible.map((n) => (
            <button
              key={n.id}
              className={`notification-item ${n.readAt ? "" : "unread"}`}
              onClick={() => {
                if (!n.readAt) markRead(n.id);
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
      </div>
    </>
  );
}

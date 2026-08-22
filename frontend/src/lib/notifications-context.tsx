import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead, notificationStreamUrl
} from "./api";
import { useAuth } from "./auth-context";
import type { AppNotification } from "./types";

type NotificationsState = {
  unreadCount: number;
  recent: AppNotification[];
  loading: boolean;
  refresh: () => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number | null>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchNotifications(false, 20), fetchUnreadCount()])
      .then(([list, unread]) => {
        setRecent(list);
        setUnreadCount(unread.count);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRecent([]);
      setUnreadCount(0);
      return;
    }
    refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const source = new EventSource(notificationStreamUrl());
      sourceRef.current = source;

      source.addEventListener("unread-count", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { count: number };
          setUnreadCount(payload.count);
        } catch {
          // ignore malformed payloads
        }
      });

      source.addEventListener("notification", (event) => {
        try {
          const notification = JSON.parse((event as MessageEvent).data) as AppNotification;
          setRecent((current) => [notification, ...current].slice(0, 20));
        } catch {
          // ignore malformed payloads
        }
      });

      source.onerror = () => {
        source.close();
        if (!cancelled) {
          retryRef.current = window.setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      if (retryRef.current) window.clearTimeout(retryRef.current);
    };
  }, [user]);

  const markRead = useCallback((id: number) => {
    setRecent((current) => current.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((count) => Math.max(0, count - 1));
    markNotificationRead(id).catch(() => refresh());
  }, [refresh]);

  const markAllRead = useCallback(() => {
    setRecent((current) => current.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => refresh());
  }, [refresh]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, recent, loading, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationsProvider");
  return context;
}

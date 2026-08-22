import { AlertTriangle, Inbox, Lock, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingSkeleton({ rows = 4, kind = "row" }: { rows?: number; kind?: "row" | "card" }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`skeleton ${kind === "card" ? "skeleton-card" : "skeleton-row"}`} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="state">
      {icon ?? <Inbox size={32} />}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state">
      <AlertTriangle size={32} />
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {onRetry && <button className="secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="state">
      <WifiOff size={32} />
      <h2>You're offline</h2>
      <p>Dayflow couldn't reach the server and there is no cached copy of this page yet.</p>
      {onRetry && <button className="secondary" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function PermissionDenied() {
  return (
    <div className="state">
      <Lock size={32} />
      <h2>Access restricted</h2>
      <p>Your role does not include this permission. Ask a Super Admin to adjust your access.</p>
    </div>
  );
}

export function StaleDataBanner({ asOf }: { asOf: string | null }) {
  return (
    <div className="connection-banner stale" role="status">
      Showing the last data that loaded successfully{asOf ? ` (as of ${new Date(asOf).toLocaleTimeString()})` : ""}. Reconnecting…
    </div>
  );
}

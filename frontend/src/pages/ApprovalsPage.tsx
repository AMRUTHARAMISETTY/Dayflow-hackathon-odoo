import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decideCorrection, decideLeaveRequest, fetchDashboard } from "../lib/api";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import { ReasonDialog } from "../components/ReasonDialog";
import type { AttentionItem } from "../lib/types";

/** The spec's "Action Center" (section 4.3): every pending thing waiting on this person, in one
 * place, with real inline actions rather than just links out to other pages. Built on top of the
 * same permission-scoped `needsAttention` list the dashboard widget uses, so the two never
 * disagree about what's outstanding. */
export function ApprovalsPage() {
  const notify = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ item: AttentionItem; approve: boolean } | null>(null);

  const load = () => {
    setError(null);
    fetchDashboard()
      .then((result) => setItems(result.data.needsAttention))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your action center."));
  };

  useEffect(load, []);

  if (error && !items) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <LoadingSkeleton rows={5} />;
  if (items.length === 0) return <EmptyState title="Nothing needs your attention" description="New approvals and follow-ups will show up here as they come in." />;

  const decide = async (item: AttentionItem, approve: boolean, reason: string) => {
    if (item.entityType === "LeaveRequest" && item.entityId) {
      await decideLeaveRequest(item.entityId, approve, reason);
    } else if (item.entityType === "AttendanceCorrection" && item.entityId) {
      await decideCorrection(item.entityId, approve, reason);
    }
    setDialog(null);
    notify("success", "Decision recorded.");
    load();
  };

  return (
    <>
      <div className="attention-list">
        {items.map((item, index) => (
          <div className="attention-item" key={index}>
            <div>
              <span className={`severity-pill ${item.severity.toLowerCase().replace(/\s+/g, "-")}`}>{item.severity}</span>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{item.title}</div>
              <div className="meta">{item.detail}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(item.entityType === "LeaveRequest" || item.entityType === "AttendanceCorrection") ? (
                <>
                  <button className="secondary" onClick={() => setDialog({ item, approve: true })}>Approve</button>
                  <button className="secondary" onClick={() => setDialog({ item, approve: false })}>Reject</button>
                </>
              ) : (
                <button className="secondary" onClick={() => navigate(item.href)}>{item.actionLabel}</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {dialog && (
        <ReasonDialog
          title={`${dialog.approve ? "Approve" : "Reject"}: ${dialog.item.title}`}
          description={dialog.item.detail}
          confirmLabel={dialog.approve ? "Approve" : "Reject"}
          tone={dialog.approve ? "primary" : "danger"}
          onCancel={() => setDialog(null)}
          onConfirm={(reason) => decide(dialog.item, dialog.approve, reason)}
        />
      )}
    </>
  );
}

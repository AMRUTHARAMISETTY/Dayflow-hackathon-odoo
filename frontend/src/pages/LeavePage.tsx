import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  cancelLeaveRequest, decideLeaveRequest, fetchLeaveAvailability, fetchLeaveBalances, fetchLeaveRequests,
  fetchLeaveTypes, submitLeaveRequest
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import { ReasonDialog } from "../components/ReasonDialog";
import type { LeaveBalance, LeaveRequest, LeaveType } from "../lib/types";

export function LeavePage() {
  const { user, can } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"mine" | "approvals" | "availability">(params.get("tab") === "approvals" && can("leave:approve") ? "approvals" : "mine");

  return (
    <>
      <div className="tab-bar" role="tablist">
        <button role="tab" className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>My Leave</button>
        {can("leave:approve") && (
          <button role="tab" className={tab === "approvals" ? "active" : ""} onClick={() => setTab("approvals")}>Approvals</button>
        )}
        <button role="tab" className={tab === "availability" ? "active" : ""} onClick={() => setTab("availability")}>Team Availability</button>
      </div>
      {tab === "mine" && <MyLeaveView employeeId={user!.employeeId} openRequest={params.get("request") === "1"} onOpenHandled={() => setParams({})} />}
      {tab === "approvals" && can("leave:approve") && <ApprovalsView />}
      {tab === "availability" && <AvailabilityView />}
    </>
  );
}

function MyLeaveView({ employeeId, openRequest, onOpenHandled }: { employeeId: number; openRequest: boolean; onOpenHandled: () => void }) {
  const { can } = useAuth();
  const notify = useToast();
  const [balances, setBalances] = useState<LeaveBalance[] | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(openRequest);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  const load = () => {
    Promise.all([fetchLeaveBalances(employeeId), fetchLeaveRequests(undefined, employeeId)])
      .then(([b, r]) => { setBalances(b); setRequests(r.items); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load leave data."));
  };

  useEffect(load, [employeeId]);
  useEffect(() => { if (openRequest) { setShowRequest(true); onOpenHandled(); } }, [openRequest, onOpenHandled]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!balances || !requests) return <LoadingSkeleton rows={5} />;

  return (
    <>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Balances</h3>
          <div className="spacer" />
          {can("leave:request") && <button className="primary" onClick={() => setShowRequest(true)}><Plus size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />Request leave</button>}
        </div>
        <div className="balance-grid">
          {balances.map((b) => (
            <div className="balance-card" key={b.leaveTypeId}>
              <div className="value">{b.balance}</div>
              <div className="label">{b.leaveTypeName}</div>
            </div>
          ))}
        </div>
      </div>

      <h3>My requests</h3>
      {requests.length === 0 ? <EmptyState title="No leave requests yet" /> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Decision</th><th></th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td data-label="Type">{r.leaveTypeName}</td>
                  <td data-label="Dates">{new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</td>
                  <td data-label="Days">{r.days}</td>
                  <td data-label="Status"><span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}{r.autoApproved ? " (auto)" : ""}</span></td>
                  <td data-label="Decision">{r.decisionReason ?? "—"}</td>
                  <td data-label="">
                    {(r.status === "PENDING" || (r.status === "APPROVED" && new Date(r.startDate) > new Date())) && (
                      <button className="secondary" onClick={() => setCancelTarget(r)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRequest && (
        <RequestLeaveModal onClose={() => setShowRequest(false)} onSubmitted={() => { setShowRequest(false); notify("success", "Leave request submitted."); load(); }} />
      )}
      {cancelTarget && (
        <ReasonDialog
          title="Cancel leave request"
          description={`Cancel ${cancelTarget.leaveTypeName} for ${new Date(cancelTarget.startDate).toLocaleDateString()} – ${new Date(cancelTarget.endDate).toLocaleDateString()}?`}
          confirmLabel="Cancel request"
          tone="danger"
          onCancel={() => setCancelTarget(null)}
          onConfirm={async (reason) => {
            await cancelLeaveRequest(cancelTarget.id, reason);
            setCancelTarget(null);
            notify("success", "Leave request cancelled.");
            load();
          }}
        />
      )}
    </>
  );
}

function RequestLeaveModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchLeaveTypes().then((list) => { setTypes(list); if (list.length > 0) setLeaveTypeId(String(list[0].id)); }); }, []);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Request leave</h2>
        <p className="modal-sub">A single working day with sufficient balance is auto-approved. Everything else routes to your manager or HR.</p>
        <label className="field">
          Leave type
          <select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.paid ? "" : " (unpaid)"}</option>)}
          </select>
        </label>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <label className="field">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="field">End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !leaveTypeId || !startDate || !endDate || !reason.trim()} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await submitLeaveRequest({ leaveTypeId: Number(leaveTypeId), startDate, endDate, reason: reason.trim() });
              onSubmitted();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not submit leave request.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Submitting…" : "Submit request"}</button>
        </div>
      </div>
    </div>
  );
}

function ApprovalsView() {
  const notify = useToast();
  const [status, setStatus] = useState("PENDING");
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<LeaveRequest | null>(null);
  const [approve, setApprove] = useState(true);

  const load = () => {
    fetchLeaveRequests(status || undefined)
      .then((result) => setRequests(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load leave requests."));
  };

  useEffect(load, [status]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!requests) return <LoadingSkeleton rows={5} />;

  return (
    <>
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      {requests.length === 0 ? <EmptyState title="Nothing here" /> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td data-label="Employee">{r.employeeName}</td>
                  <td data-label="Type">{r.leaveTypeName}</td>
                  <td data-label="Dates">{new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</td>
                  <td data-label="Days">{r.days}</td>
                  <td data-label="Reason">{r.reason}</td>
                  <td data-label="Status"><span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}</span></td>
                  <td data-label="">
                    {r.status === "PENDING" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="secondary" onClick={() => { setApprove(true); setDialog(r); }}>Approve</button>
                        <button className="secondary" onClick={() => { setApprove(false); setDialog(r); }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && (
        <ReasonDialog
          title={`${approve ? "Approve" : "Reject"} leave request`}
          description={`${dialog.employeeName} — ${dialog.leaveTypeName}, ${new Date(dialog.startDate).toLocaleDateString()} – ${new Date(dialog.endDate).toLocaleDateString()}`}
          confirmLabel={approve ? "Approve" : "Reject"}
          tone={approve ? "primary" : "danger"}
          onCancel={() => setDialog(null)}
          onConfirm={async (reason) => {
            await decideLeaveRequest(dialog.id, approve, reason);
            setDialog(null);
            notify("success", "Leave request decided.");
            load();
          }}
        />
      )}
    </>
  );
}

function AvailabilityView() {
  const [items, setItems] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchLeaveAvailability(7).then(setItems).catch((err) => setError(err instanceof Error ? err.message : "Could not load availability."));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <LoadingSkeleton rows={4} />;
  if (items.length === 0) return <EmptyState title="Everyone in scope is available this week" />;

  return (
    <div className="panel">
      <h3>Next 7 days</h3>
      <div className="activity-list">
        {items.map((r) => (
          <div className="activity-row" key={r.id}>
            <span><span className="actor">{r.employeeName}</span> · {r.leaveTypeName}</span>
            <span>{new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, LogIn, LogOut } from "lucide-react";
import {
  checkIn, checkOut, decideCorrection, fetchAttendanceToday, fetchCorrections, fetchDepartments, fetchEmployeeAttendance,
  requestCorrection
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton, StaleDataBanner } from "../components/StateViews";
import { ReasonDialog } from "../components/ReasonDialog";
import type { AttendanceCorrection, AttendanceDayView, Department } from "../lib/types";

export function AttendancePage() {
  const { user, can } = useAuth();
  const [params] = useSearchParams();
  const requestedTab = params.get("tab");
  const [tab, setTab] = useState<"today" | "mine" | "corrections">(
    requestedTab === "corrections" ? "corrections" : (can("attendance:read") || can("attendance:read:reports")) ? "today" : "mine"
  );
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <CheckInWidget onChanged={() => setRefreshKey((k) => k + 1)} />
      <div className="tab-bar" role="tablist">
        {(can("attendance:read") || can("attendance:read:reports")) && (
          <button role="tab" className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>Today</button>
        )}
        <button role="tab" className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>My Attendance</button>
        {(can("attendance:approve_correction") || can("attendance:correct")) && (
          <button role="tab" className={tab === "corrections" ? "active" : ""} onClick={() => setTab("corrections")}>Corrections</button>
        )}
      </div>
      {tab === "today" && <TodayView refreshKey={refreshKey} />}
      {tab === "mine" && <MyAttendanceView employeeId={user!.employeeId} refreshKey={refreshKey} />}
      {tab === "corrections" && <CorrectionsView />}
    </>
  );
}

function CheckInWidget({ onChanged }: { onChanged: () => void }) {
  const { user, can } = useAuth();
  const notify = useToast();
  const [today, setToday] = useState<AttendanceDayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetchAttendanceToday().then((result) => {
      setToday(result.data.find((d) => d.employeeId === user?.employeeId) ?? null);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!can("attendance:checkin")) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can("attendance:checkin")) return null;

  const act = async (fn: () => Promise<AttendanceDayView>) => {
    setBusy(true);
    try {
      const result = await fn();
      setToday(result);
      onChanged();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not update attendance.");
    } finally {
      setBusy(false);
    }
  };

  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;

  return (
    <div className="panel checkin-widget" style={{ marginBottom: 20 }}>
      <Clock size={28} style={{ color: "var(--brand)" }} />
      <div className="checkin-status">
        <span className="big-time">{today?.checkIn ? new Date(today.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
        <span className="label">Checked in {today?.checkOut ? `· out ${new Date(today.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
      </div>
      <div className="spacer" />
      {loading ? null : !checkedIn ? (
        <button className="primary" disabled={busy} onClick={() => act(checkIn)}><LogIn size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Check in</button>
      ) : !checkedOut ? (
        <button className="secondary" disabled={busy} onClick={() => act(checkOut)}><LogOut size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Check out</button>
      ) : (
        <span className="status-pill active">Day complete</span>
      )}
    </div>
  );
}

function TodayView({ refreshKey }: { refreshKey: number }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [rows, setRows] = useState<AttendanceDayView[]>([]);
  const [stale, setStale] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (can("department:read")) fetchDepartments().then(setDepartments).catch(() => undefined); }, [can]);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAttendanceToday(departmentId ? Number(departmentId) : undefined)
      .then((result) => { setRows(result.data); setStale(result.stale); setAsOf(result.asOf); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load today's attendance."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [departmentId, refreshKey]);

  return (
    <>
      {stale && <StaleDataBanner asOf={asOf} />}
      {departments.length > 0 && (
        <div className="toolbar">
          <select aria-label="Department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}
      {loading && rows.length === 0 && <LoadingSkeleton rows={6} />}
      {error && rows.length === 0 && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && <EmptyState title="No one in scope today" />}
      {rows.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Check in</th><th>Check out</th><th>Status</th><th>Late</th><th>Overtime</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employeeId} className="clickable" onClick={() => navigate(`/employees/${row.employeeId}`)}>
                  <td data-label="Employee">{row.employeeName}</td>
                  <td data-label="Department">{row.departmentName ?? "—"}</td>
                  <td data-label="Check in">{row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td data-label="Check out">{row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td data-label="Status"><DayStatusPill row={row} /></td>
                  <td data-label="Late">{row.lateMinutes > 0 ? `${row.lateMinutes}m` : "—"}</td>
                  <td data-label="Overtime">{row.overtimeMinutes > 0 ? `${row.overtimeMinutes}m` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function DayStatusPill({ row }: { row: AttendanceDayView }) {
  const label = row.missingCheckout ? "Missing checkout" : row.status;
  const cls = row.missingCheckout ? "suspended" : row.status.toLowerCase().replace(/\s+/g, "-");
  return <span className={`status-pill ${cls}`}>{label}</span>;
}

export function MyAttendanceView({ employeeId, refreshKey = 0 }: { employeeId: number; refreshKey?: number }) {
  const { can } = useAuth();
  const notify = useToast();
  const [days, setDays] = useState<AttendanceDayView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCorrectionFor, setShowCorrectionFor] = useState<AttendanceDayView | null>(null);

  const load = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 13);
    fetchEmployeeAttendance(employeeId, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10))
      .then(setDays)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load attendance history."));
  };

  useEffect(load, [employeeId, refreshKey]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!days) return <LoadingSkeleton rows={6} />;

  return (
    <div className="panel">
      <h3>Last 14 days</h3>
      {[...days].reverse().map((day) => (
        <div className={`day-cell status-${day.status.toLowerCase().replace(/\s+/g, "-")}`} key={day.workDate}>
          <div>
            <strong>{new Date(day.workDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</strong>
            <span style={{ marginLeft: 10, fontSize: 12, color: "var(--text-muted)" }}>
              {day.checkIn ? new Date(day.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              {" – "}
              {day.checkOut ? new Date(day.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DayStatusPill row={day} />
            {can("attendance:correct") && (day.status === "Absent" || day.missingCheckout || day.status === "Present") && (
              <button className="link" onClick={() => setShowCorrectionFor(day)}>Request correction</button>
            )}
          </div>
        </div>
      ))}
      {showCorrectionFor && (
        <CorrectionRequestModal
          day={showCorrectionFor}
          onClose={() => setShowCorrectionFor(null)}
          onSubmitted={() => { setShowCorrectionFor(null); notify("success", "Correction requested."); load(); }}
        />
      )}
    </div>
  );
}

function CorrectionRequestModal({ day, onClose, onSubmitted }: { day: AttendanceDayView; onClose: () => void; onSubmitted: () => void }) {
  const [checkInTime, setCheckInTime] = useState(day.checkIn ? day.checkIn.slice(11, 16) : "09:00");
  const [checkOutTime, setCheckOutTime] = useState(day.checkOut ? day.checkOut.slice(11, 16) : "18:00");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Request correction</h2>
        <p className="modal-sub">{new Date(day.workDate).toLocaleDateString()}</p>
        <div className="form-grid">
          <label className="field">Requested check-in<input type="time" value={checkInTime} onChange={(event) => setCheckInTime(event.target.value)} /></label>
          <label className="field">Requested check-out<input type="time" value={checkOutTime} onChange={(event) => setCheckOutTime(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why does this need correcting?" /></label>
        <label className="field" style={{ marginTop: 12 }}>Evidence note (optional)<input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="e.g. badge log reference" /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !reason.trim()} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await requestCorrection({
                workDate: day.workDate,
                requestedCheckIn: `${day.workDate}T${checkInTime}:00`,
                requestedCheckOut: `${day.workDate}T${checkOutTime}:00`,
                reason: reason.trim(),
                evidenceNote: evidence.trim() || undefined
              });
              onSubmitted();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not submit correction.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Submitting…" : "Submit request"}</button>
        </div>
      </div>
    </div>
  );
}

function CorrectionsView() {
  const { can } = useAuth();
  const notify = useToast();
  const [status, setStatus] = useState(can("attendance:approve_correction") ? "PENDING" : "");
  const [items, setItems] = useState<AttendanceCorrection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<AttendanceCorrection | null>(null);

  const load = () => {
    fetchCorrections(status || undefined)
      .then((result) => setItems(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load corrections."));
  };

  useEffect(load, [status]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <LoadingSkeleton rows={5} />;

  return (
    <>
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {items.length === 0 ? <EmptyState title="No correction requests" /> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Date</th><th>Requested</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Employee">{item.employeeName}</td>
                  <td data-label="Date">{new Date(item.workDate).toLocaleDateString()}</td>
                  <td data-label="Requested">
                    {item.requestedCheckIn ? new Date(item.requestedCheckIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    {" – "}
                    {item.requestedCheckOut ? new Date(item.requestedCheckOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td data-label="Reason">{item.reason}</td>
                  <td data-label="Status"><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span></td>
                  <td data-label="">
                    {item.status === "PENDING" && can("attendance:approve_correction") && (
                      <button className="secondary" onClick={() => setDialog(item)}>Decide</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && (
        <DecideCorrectionDialog
          correction={dialog}
          onClose={() => setDialog(null)}
          onDecided={() => { setDialog(null); notify("success", "Correction decided."); load(); }}
        />
      )}
    </>
  );
}

function DecideCorrectionDialog({ correction, onClose, onDecided }: { correction: AttendanceCorrection; onClose: () => void; onDecided: () => void }) {
  const [approve, setApprove] = useState(true);
  return (
    <ReasonDialog
      title={`Decide correction for ${correction.employeeName}`}
      description={`Requested ${correction.requestedCheckIn ? new Date(correction.requestedCheckIn).toLocaleTimeString() : "—"} – ${correction.requestedCheckOut ? new Date(correction.requestedCheckOut).toLocaleTimeString() : "—"} on ${new Date(correction.workDate).toLocaleDateString()}. ${correction.evidenceNote ?? ""}`}
      confirmLabel={approve ? "Approve" : "Reject"}
      tone={approve ? "primary" : "danger"}
      onCancel={onClose}
      onConfirm={async (reason) => {
        await decideCorrection(correction.id, approve, reason);
        onDecided();
      }}
    >
      <label className="field" style={{ marginBottom: 10 }}>
        Decision
        <select value={approve ? "approve" : "reject"} onChange={(event) => setApprove(event.target.value === "approve")}>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
      </label>
    </ReasonDialog>
  );
}

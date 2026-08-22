import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  approvePayroll, calculatePayroll, createPayrollRun, fetchMySlips, fetchPayrollAnomalies, fetchPayrollLines,
  fetchPayrollRun, fetchPayrollRuns, markPayrollPaid, publishPayroll, resolvePayrollAnomaly, submitPayrollForReview
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import { ReasonDialog } from "../components/ReasonDialog";
import type { PayrollAnomaly, PayrollLine, PayrollRun } from "../lib/types";

const STATUS_FLOW: PayrollRun["status"][] = ["DRAFT", "CALCULATED", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "PAID"];

export function PayrollPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<"runs" | "mine">(can("payroll:read") ? "runs" : "mine");
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  return (
    <>
      <div className="tab-bar" role="tablist">
        {can("payroll:read") && (
          <button role="tab" className={tab === "runs" ? "active" : ""} onClick={() => { setTab("runs"); setSelectedRunId(null); }}>Payroll Runs</button>
        )}
        <button role="tab" className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>My Slips</button>
      </div>
      {tab === "runs" && can("payroll:read") && (
        selectedRunId ? (
          <RunDetail runId={selectedRunId} onBack={() => setSelectedRunId(null)} />
        ) : (
          <RunsList onOpen={setSelectedRunId} />
        )
      )}
      {tab === "mine" && <MySlips />}
    </>
  );
}

function RunsList({ onOpen }: { onOpen: (id: number) => void }) {
  const { can } = useAuth();
  const notify = useToast();
  const [runs, setRuns] = useState<PayrollRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    fetchPayrollRuns().then((result) => setRuns(result.items)).catch((err) => setError(err instanceof Error ? err.message : "Could not load payroll runs."));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!runs) return <LoadingSkeleton rows={4} />;

  return (
    <>
      <div className="toolbar">
        <div className="spacer" />
        {can("payroll:manage") && (
          <button className="primary" onClick={() => setShowCreate(true)}><Plus size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />New payroll run</button>
        )}
      </div>
      {runs.length === 0 ? <EmptyState title="No payroll runs yet" /> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Period</th><th>Status</th><th>Employees</th><th>Total net</th><th>Created by</th></tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="clickable" onClick={() => onOpen(run.id)}>
                  <td data-label="Period">{run.periodMonth}</td>
                  <td data-label="Status"><RunStatusPill status={run.status} /></td>
                  <td data-label="Employees">{run.employeeCount}</td>
                  <td data-label="Total net">{run.totalNet}</td>
                  <td data-label="Created by">{run.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && (
        <CreateRunModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); notify("success", "Payroll run created."); load(); onOpen(id); }} />
      )}
    </>
  );
}

function RunStatusPill({ status }: { status: string }) {
  const cls = status === "PAID" || status === "PUBLISHED" ? "active" : status === "APPROVED" || status === "UNDER_REVIEW" ? "pending" : "suspended";
  return <span className={`status-pill ${cls}`}>{status.replace(/_/g, " ")}</span>;
}

function CreateRunModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>New payroll run</h2>
        <label className="field">Period<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              const run = await createPayrollRun(period);
              onCreated(run.id);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create payroll run.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

function RunDetail({ runId, onBack }: { runId: number; onBack: () => void }) {
  const { can } = useAuth();
  const notify = useToast();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [anomalies, setAnomalies] = useState<PayrollAnomaly[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<PayrollAnomaly | null>(null);

  const load = () => {
    setError(null);
    Promise.all([fetchPayrollRun(runId), fetchPayrollLines(runId), fetchPayrollAnomalies(runId)])
      .then(([r, l, a]) => { setRun(r); setLines(l); setAnomalies(a); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this payroll run."));
  };
  useEffect(load, [runId]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!run) return <LoadingSkeleton rows={5} />;

  const openBlocking = anomalies.filter((a) => a.blocking && a.reviewStatus === "OPEN").length;

  const act = async (fn: () => Promise<PayrollRun>, successMessage: string) => {
    setBusy(true);
    try {
      await fn();
      notify("success", successMessage);
      load();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not update this payroll run.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="link" onClick={onBack} style={{ marginBottom: 12 }}>&larr; All payroll runs</button>
      <div className="profile-header">
        <div style={{ flex: 1 }}>
          <h1>{run.periodMonth}</h1>
          <p className="designation"><RunStatusPill status={run.status} /></p>
          <div className="profile-meta">
            <div><span>Employees</span>{run.employeeCount}</div>
            <div><span>Total gross</span>{run.totalGross}</div>
            <div><span>Total deductions</span>{run.totalDeductions}</div>
            <div><span>Total net</span>{run.totalNet}</div>
            <div><span>Calculated by</span>{run.calculatedByName ?? "—"}</div>
            <div><span>Approved by</span>{run.approvedByName ?? "—"}</div>
            <div><span>Published by</span>{run.publishedByName ?? "—"}</div>
            <div><span>Paid</span>{run.paidAt ? new Date(run.paidAt).toLocaleDateString() : "—"}</div>
          </div>
        </div>
        <div className="profile-actions">
          {can("payroll:manage") && ["DRAFT", "CALCULATED"].includes(run.status) && (
            <button className="secondary" disabled={busy} onClick={() => act(() => calculatePayroll(run.id), "Payroll calculated.")}>
              {run.status === "DRAFT" ? "Calculate" : "Recalculate"}
            </button>
          )}
          {can("payroll:manage") && run.status === "CALCULATED" && (
            <button className="secondary" disabled={busy} onClick={() => act(() => submitPayrollForReview(run.id), "Submitted for review.")}>Submit for review</button>
          )}
          {can("payroll:approve") && run.status === "UNDER_REVIEW" && (
            <button className="primary" disabled={busy} onClick={() => setApproveDialog(true)}>Approve</button>
          )}
          {can("payroll:publish") && run.status === "APPROVED" && (
            <button className="primary" disabled={busy} onClick={() => act(() => publishPayroll(run.id), "Payroll published. Employees have been notified.")}>
              Publish{openBlocking > 0 ? ` (${openBlocking} blocking)` : ""}
            </button>
          )}
          {can("payroll:publish") && run.status === "PUBLISHED" && (
            <button className="secondary" disabled={busy} onClick={() => act(() => markPayrollPaid(run.id), "Marked as paid.")}>Mark paid</button>
          )}
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Anomalies</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Issue</th><th>Severity</th><th>Cause</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Employee">{a.employeeName ?? "—"}</td>
                    <td data-label="Issue">{a.issueCode.replace(/_/g, " ")}{a.blocking && <span className="status-pill suspended" style={{ marginLeft: 6 }}>Blocking</span>}</td>
                    <td data-label="Severity">{a.severity}</td>
                    <td data-label="Cause">{a.possibleCause}</td>
                    <td data-label="Status"><span className={`status-pill ${a.reviewStatus === "OPEN" ? "pending" : "active"}`}>{a.reviewStatus}</span></td>
                    <td data-label="">
                      {a.reviewStatus === "OPEN" && can("payroll:manage") && (
                        <button className="secondary" onClick={() => setResolveTarget(a)}>Review</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Salary lines</h3>
        {lines.length === 0 ? <EmptyState title="No lines yet" description="Calculate this run to generate salary lines." /> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Department</th><th>Gross</th><th>Unpaid days</th><th>Deductions</th><th>Net pay</th></tr></thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td data-label="Employee">{line.employeeName}</td>
                    <td data-label="Department">{line.departmentName ?? "—"}</td>
                    <td data-label="Gross">{line.grossEarnings}</td>
                    <td data-label="Unpaid days">{line.unpaidLeaveDays}</td>
                    <td data-label="Deductions">{line.totalDeductions}</td>
                    <td data-label="Net pay"><strong>{line.netPay}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approveDialog && (
        <ReasonDialog
          title="Approve payroll run"
          description={`${run.periodMonth} — ${run.employeeCount} employees, ${run.totalNet} total net pay. You must be a different person than whoever calculated this run.`}
          confirmLabel="Approve"
          onCancel={() => setApproveDialog(false)}
          onConfirm={async (reason) => {
            await approvePayroll(run.id, reason);
            setApproveDialog(false);
            notify("success", "Payroll approved.");
            load();
          }}
        />
      )}
      {resolveTarget && (
        <ResolveAnomalyDialog anomaly={resolveTarget} onClose={() => setResolveTarget(null)} onResolved={() => { setResolveTarget(null); load(); }} />
      )}
    </>
  );
}

function ResolveAnomalyDialog({ anomaly, onClose, onResolved }: { anomaly: PayrollAnomaly; onClose: () => void; onResolved: () => void }) {
  const notify = useToast();
  const [status, setStatus] = useState<"ACKNOWLEDGED" | "RESOLVED">("RESOLVED");
  return (
    <ReasonDialog
      title="Review anomaly"
      description={`${anomaly.issueCode.replace(/_/g, " ")} — ${anomaly.recommendedAction}`}
      confirmLabel="Save"
      onCancel={onClose}
      onConfirm={async (note) => {
        await resolvePayrollAnomaly(anomaly.id, status, note);
        notify("success", "Anomaly reviewed.");
        onResolved();
      }}
    >
      <label className="field" style={{ marginBottom: 10 }}>
        Outcome
        <select value={status} onChange={(event) => setStatus(event.target.value as "ACKNOWLEDGED" | "RESOLVED")}>
          <option value="RESOLVED">Resolved — the underlying issue is fixed</option>
          <option value="ACKNOWLEDGED">Acknowledged — reviewed, publishing anyway</option>
        </select>
      </label>
    </ReasonDialog>
  );
}

function MySlips() {
  const [slips, setSlips] = useState<PayrollLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    fetchMySlips().then(setSlips).catch((err) => setError(err instanceof Error ? err.message : "Could not load your salary slips."));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!slips) return <LoadingSkeleton rows={3} />;
  if (slips.length === 0) return <EmptyState title="No salary slips yet" description="Slips appear here once payroll is published for a period you were paid for." />;

  return (
    <div className="panel">
      {slips.map((slip) => (
        <div key={slip.id} className="day-cell status-present" style={{ flexDirection: "column", alignItems: "stretch", cursor: "pointer" }}
          onClick={() => setExpanded(expanded === slip.id ? null : slip.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <strong>Net pay: {slip.netPay}</strong>
            <span>{expanded === slip.id ? "Hide" : "Details"}</span>
          </div>
          {expanded === slip.id && (
            <div className="profile-meta" style={{ marginTop: 10 }}>
              <div><span>Basic</span>{slip.basic}</div>
              <div><span>HRA</span>{slip.hra}</div>
              <div><span>Allowances</span>{slip.allowances}</div>
              <div><span>Overtime pay</span>{slip.overtimePay}</div>
              <div><span>Gross earnings</span>{slip.grossEarnings}</div>
              <div><span>Unpaid leave days</span>{slip.unpaidLeaveDays}</div>
              <div><span>Unpaid leave deduction</span>{slip.unpaidLeaveDeduction}</div>
              <div><span>Tax deduction</span>{slip.taxDeduction}</div>
              <div><span>Other deductions</span>{slip.otherDeductions}</div>
              <div><span>Total deductions</span>{slip.totalDeductions}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

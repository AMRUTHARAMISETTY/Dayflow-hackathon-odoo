import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, Mail, Pencil, RefreshCcw, UserX } from "lucide-react";
import {
  ApiError, archiveEmployee, createInvitation, createSalaryStructure, fetchEmployee, fetchEmployeeHistory,
  fetchEmployees, fetchLeaveBalances, fetchLeaveRequests, fetchSalaryStructures, fetchSlipsForEmployee,
  reactivateEmployee, suspendEmployee, updateEmployeeBasic, updateEmployeeJobDetails, updatePayrollVerification
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton, PermissionDenied } from "../components/StateViews";
import { ReasonDialog } from "../components/ReasonDialog";
import { StatusPill } from "./EmployeesPage";
import { MyAttendanceView } from "./AttendancePage";
import type { Employee, EmployeeJobHistoryEntry, LeaveBalance, LeaveRequest, PayrollLine, SalaryStructure } from "../lib/types";

const LOCKED_TABS = [
  { key: "documents", label: "Documents", phase: "Phase 4" },
  { key: "skills", label: "Skills & Training", phase: "Phase 6" },
  { key: "assets", label: "Assets", phase: "Phase 4" }
];

export function EmployeeProfilePage() {
  const { id } = useParams();
  const employeeId = Number(id);
  const { can } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<EmployeeJobHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<"overview" | "personal" | "employment" | "history" | "attendance" | "leave" | "payroll">("overview");
  const [dialog, setDialog] = useState<null | "suspend" | "reactivate" | "archive">(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingJob, setEditingJob] = useState(false);
  const [invitePreview, setInvitePreview] = useState<{ acceptPath: string; token: string } | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    Promise.all([fetchEmployee(employeeId), fetchEmployeeHistory(employeeId).catch(() => [])])
      .then(([emp, hist]) => {
        setEmployee(emp);
        setHistory(hist);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(err instanceof Error ? err.message : "Could not load this employee.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [employeeId]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (forbidden) return <PermissionDenied />;
  if (error || !employee) return <ErrorState message={error ?? "Employee not found."} onRetry={load} />;

  const tenure = employee.joiningDate ? formatTenure(employee.joiningDate) : "—";

  return (
    <>
      <div className="profile-header">
        <span className="avatar lg">{employee.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}</span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{employee.name}</h1>
          <p className="designation">{employee.designation ?? "No designation set"} · {employee.employeeCode ?? "No code yet"}</p>
          <div className="profile-meta">
            <div><span>Department</span>{employee.departmentName ?? "—"}</div>
            <div><span>Manager</span>{employee.managerName ?? "—"}</div>
            <div><span>Location</span>{employee.location ?? "—"}</div>
            <div><span>Status</span><StatusPill status={employee.status} /></div>
            <div><span>Joined</span>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "—"}</div>
            <div><span>Tenure</span>{tenure}</div>
            <div><span>Portal access</span>{employee.hasLoginAccount ? "Active login" : "No login yet"}</div>
            <div><span>Last updated</span>{employee.updatedAt ? new Date(employee.updatedAt).toLocaleString() : "—"}</div>
          </div>
        </div>
        <div className="profile-actions">
          {can("invitation:write") && !employee.hasLoginAccount && (
            <button className="secondary" onClick={async () => {
              try {
                const created = await createInvitation(employee.email, "EMPLOYEE", employee.id);
                setInvitePreview({ acceptPath: created.acceptPath, token: created.token });
                notify("success", "Invitation created.");
              } catch (err) {
                notify("error", err instanceof Error ? err.message : "Could not create invitation.");
              }
            }}><Mail size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Send invitation</button>
          )}
          {can("employee:write") && (
            <button className="secondary" onClick={() => setEditingBasic(true)}><Pencil size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Edit contact</button>
          )}
          {can("employee:write:sensitive") && (
            <button className="secondary" onClick={() => setEditingJob(true)}><Pencil size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Update job details</button>
          )}
          {can("employee:suspend") && employee.status !== "Suspended" && employee.status !== "Archived" && (
            <button className="secondary" onClick={() => setDialog("suspend")}><UserX size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Suspend</button>
          )}
          {can("employee:suspend") && employee.status === "Suspended" && (
            <button className="secondary" onClick={() => setDialog("reactivate")}><RefreshCcw size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Reactivate</button>
          )}
          {can("employee:archive") && employee.status !== "Archived" && (
            <button className="danger" onClick={() => setDialog("archive")}><Archive size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Archive</button>
          )}
        </div>
      </div>

      {invitePreview && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Invitation link (Phase 1 stand-in for email delivery)</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Share this link with {employee.name}. It expires in 72 hours and can only be used once.</p>
          <div className="copy-box">{window.location.origin}{invitePreview.acceptPath}</div>
        </div>
      )}

      <div className="tab-bar" role="tablist">
        <button role="tab" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
        <button role="tab" className={tab === "personal" ? "active" : ""} onClick={() => setTab("personal")}>Personal</button>
        <button role="tab" className={tab === "employment" ? "active" : ""} onClick={() => setTab("employment")}>Employment</button>
        <button role="tab" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>History</button>
        <button role="tab" className={tab === "attendance" ? "active" : ""} onClick={() => setTab("attendance")}>Attendance</button>
        <button role="tab" className={tab === "leave" ? "active" : ""} onClick={() => setTab("leave")}>Leave</button>
        {(can("salary:read") || can("payroll:read") || can("payroll:read:own")) && (
          <button role="tab" className={tab === "payroll" ? "active" : ""} onClick={() => setTab("payroll")}>Payroll</button>
        )}
        {LOCKED_TABS.map((locked) => (
          <button key={locked.key} className="locked" disabled title={`Available ${locked.phase}`}>{locked.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid-two">
          <div className="panel">
            <h3>Snapshot</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {employee.name} joined {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "an unrecorded date"} as {employee.designation ?? "an unspecified role"} in {employee.departmentName ?? "an unassigned department"}.
              {employee.managerName ? ` They report to ${employee.managerName}.` : " No manager is currently assigned."}
            </p>
          </div>
          <div className="panel">
            <h3>Most recent change</h3>
            {history[0] ? (
              <p style={{ fontSize: 13 }}>
                <strong>{history[0].changeType}</strong> on {new Date(history[0].effectiveDate).toLocaleDateString()} — {history[0].reason ?? "No reason recorded."}
              </p>
            ) : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No changes recorded yet.</p>}
          </div>
        </div>
      )}

      {tab === "personal" && (
        <div className="panel">
          <h3>Contact</h3>
          <div className="profile-meta">
            <div><span>Email</span>{employee.email}</div>
            <div><span>Phone</span>{employee.phone ?? "Not provided"}</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 14 }}>Address, emergency contact and other demographic fields ship in a later phase.</p>
        </div>
      )}

      {tab === "employment" && (
        <div className="panel">
          <h3>Job details</h3>
          <div className="profile-meta">
            <div><span>Department</span>{employee.departmentName ?? "—"}</div>
            <div><span>Designation</span>{employee.designation ?? "—"}</div>
            <div><span>Manager</span>{employee.managerName ?? "—"}</div>
            <div><span>Location</span>{employee.location ?? "—"}</div>
            <div><span>Employment type</span>{employee.employmentType ?? "—"}</div>
            <div><span>Status</span><StatusPill status={employee.status} /></div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="panel">
          <h3>Immutable job history</h3>
          {history.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No changes recorded yet.</p>
          ) : (
            <div className="timeline">
              {history.map((entry) => (
                <div className="timeline-item" key={entry.id}>
                  <div className="timeline-dot" />
                  <div className="timeline-body">
                    <div className="change-type">{entry.changeType} · {entry.status}</div>
                    <div className="when">Effective {new Date(entry.effectiveDate).toLocaleDateString()} · by {entry.changedByName} · recorded {new Date(entry.createdAt).toLocaleString()}</div>
                    {entry.reason && <div className="reason">{entry.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "attendance" && <MyAttendanceView employeeId={employee.id} />}
      {tab === "leave" && <EmployeeLeaveSummary employeeId={employee.id} />}
      {tab === "payroll" && <EmployeePayrollSummary employee={employee} />}

      {editingBasic && (
        <EditContactModal employee={employee} onClose={() => setEditingBasic(false)} onSaved={(next) => { setEmployee(next); setEditingBasic(false); notify("success", "Contact info updated."); }} />
      )}
      {editingJob && (
        <EditJobDetailsModal employee={employee} onClose={() => setEditingJob(false)} onSaved={(next) => { setEmployee(next); setEditingJob(false); load(); notify("success", "Job details updated."); }} />
      )}
      {dialog === "suspend" && (
        <ReasonDialog title="Suspend employee" description={`${employee.name} will lose active status until reactivated.`} confirmLabel="Suspend" tone="danger"
          onCancel={() => setDialog(null)}
          onConfirm={async (reason) => { const next = await suspendEmployee(employee.id, reason); setEmployee(next); setDialog(null); load(); notify("success", "Employee suspended."); }} />
      )}
      {dialog === "reactivate" && (
        <ReasonDialog title="Reactivate employee" description={`${employee.name} will be marked Active again.`} confirmLabel="Reactivate"
          onCancel={() => setDialog(null)}
          onConfirm={async (reason) => { const next = await reactivateEmployee(employee.id, reason); setEmployee(next); setDialog(null); load(); notify("success", "Employee reactivated."); }} />
      )}
      {dialog === "archive" && (
        <ReasonDialog title="Archive employee" description={`${employee.name} will be archived. This does not delete their records.`} confirmLabel="Archive" tone="danger"
          onCancel={() => setDialog(null)}
          onConfirm={async (reason) => { const next = await archiveEmployee(employee.id, reason); setEmployee(next); setDialog(null); load(); notify("success", "Employee archived."); navigate("/employees"); }} />
      )}
    </>
  );
}

function EmployeeLeaveSummary({ employeeId }: { employeeId: number }) {
  const [balances, setBalances] = useState<LeaveBalance[] | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    Promise.all([fetchLeaveBalances(employeeId), fetchLeaveRequests(undefined, employeeId)])
      .then(([b, r]) => { setBalances(b); setRequests(r.items); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load leave data."));
  };

  useEffect(load, [employeeId]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!balances || !requests) return <LoadingSkeleton rows={4} />;

  return (
    <div className="grid-two">
      <div className="panel">
        <h3>Balances</h3>
        <div className="balance-grid">
          {balances.map((b) => (
            <div className="balance-card" key={b.leaveTypeId}>
              <div className="value">{b.balance}</div>
              <div className="label">{b.leaveTypeName}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h3>Recent requests</h3>
        {requests.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No leave requests yet.</p>
        ) : (
          <div className="activity-list">
            {requests.slice(0, 8).map((r) => (
              <div className="activity-row" key={r.id}>
                <span>{r.leaveTypeName} · {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</span>
                <span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeePayrollSummary({ employee }: { employee: Employee }) {
  const { can } = useAuth();
  const notify = useToast();
  const [structures, setStructures] = useState<SalaryStructure[] | null>(null);
  const [slips, setSlips] = useState<PayrollLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewStructure, setShowNewStructure] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);

  const load = () => {
    const requests: Promise<void>[] = [];
    if (can("salary:read")) {
      requests.push(fetchSalaryStructures(employee.id).then(setStructures));
    }
    if (can("payroll:read") || can("payroll:read:own")) {
      requests.push(fetchSlipsForEmployee(employee.id).then(setSlips).catch(() => setSlips([])));
    }
    Promise.all(requests).catch((err) => setError(err instanceof Error ? err.message : "Could not load payroll data."));
  };
  useEffect(load, [employee.id]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  const current = structures?.find((s) => s.status === "ACTIVE");

  return (
    <div className="grid-two">
      {can("salary:read") && (
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Salary structure</h3>
            <div className="spacer" />
            {can("salary:write") && <button className="secondary" onClick={() => setShowNewStructure(true)}>Revise</button>}
          </div>
          {!structures ? <LoadingSkeleton rows={2} /> : current ? (
            <div className="profile-meta">
              <div><span>Basic</span>{current.basicMonthly}</div>
              <div><span>HRA</span>{current.hraMonthly}</div>
              <div><span>Allowances</span>{current.allowancesMonthly}</div>
              <div><span>Gross monthly</span>{current.grossMonthly}</div>
              <div><span>Effective from</span>{new Date(current.effectiveFrom).toLocaleDateString()}</div>
            </div>
          ) : <EmptyState title="No salary structure configured" description="Payroll can't be calculated for this employee until one is added." />}

          <div className="toolbar" style={{ marginTop: 16, marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>Bank &amp; tax verification</strong>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={employee.bankVerified} disabled={!can("salary:write") || savingVerification} onChange={async (event) => {
                setSavingVerification(true);
                try {
                  await updatePayrollVerification(employee.id, event.target.checked, employee.taxIdVerified);
                  notify("success", "Bank verification updated.");
                } catch (err) {
                  notify("error", err instanceof Error ? err.message : "Could not update verification.");
                } finally {
                  setSavingVerification(false);
                }
              }} />
              Bank verified
            </label>
            <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={employee.taxIdVerified} disabled={!can("salary:write") || savingVerification} onChange={async (event) => {
                setSavingVerification(true);
                try {
                  await updatePayrollVerification(employee.id, employee.bankVerified, event.target.checked);
                  notify("success", "Tax verification updated.");
                } catch (err) {
                  notify("error", err instanceof Error ? err.message : "Could not update verification.");
                } finally {
                  setSavingVerification(false);
                }
              }} />
              Tax ID verified
            </label>
          </div>

          {structures && structures.length > 1 && (
            <>
              <div className="toolbar" style={{ marginTop: 16, marginBottom: 6 }}>
                <strong style={{ fontSize: 13 }}>History</strong>
              </div>
              <div className="timeline">
                {structures.filter((s) => s.status !== "ACTIVE").map((s) => (
                  <div className="timeline-item" key={s.id}>
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="change-type">{s.grossMonthly} gross/mo</div>
                      <div className="when">{new Date(s.effectiveFrom).toLocaleDateString()} – {s.effectiveTo ? new Date(s.effectiveTo).toLocaleDateString() : "—"}</div>
                      {s.reason && <div className="reason">{s.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="panel">
        <h3>Salary slips</h3>
        {!slips ? <LoadingSkeleton rows={2} /> : slips.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No published slips yet.</p>
        ) : (
          <div className="activity-list">
            {slips.map((slip) => (
              <div className="activity-row" key={slip.id}>
                <span>Net pay {slip.netPay}</span>
                <span>Gross {slip.grossEarnings}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewStructure && (
        <NewSalaryStructureModal employeeId={employee.id} onClose={() => setShowNewStructure(false)}
          onSaved={() => { setShowNewStructure(false); notify("success", "Salary structure updated."); load(); }} />
      )}
    </div>
  );
}

function NewSalaryStructureModal({ employeeId, onClose, onSaved }: { employeeId: number; onClose: () => void; onSaved: () => void }) {
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [basic, setBasic] = useState("");
  const [hra, setHra] = useState("");
  const [allowances, setAllowances] = useState("");
  const [deductions, setDeductions] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Revise salary structure</h2>
        <p className="modal-sub">Supersedes the current active structure as of the effective date. Requires a reason.</p>
        <div className="form-grid">
          <label className="field">Effective from<input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
          <label className="field">Basic monthly<input type="number" min={0} value={basic} onChange={(event) => setBasic(event.target.value)} /></label>
          <label className="field">HRA monthly<input type="number" min={0} value={hra} onChange={(event) => setHra(event.target.value)} /></label>
          <label className="field">Allowances monthly<input type="number" min={0} value={allowances} onChange={(event) => setAllowances(event.target.value)} /></label>
          <label className="field">Recurring deductions monthly<input type="number" min={0} value={deductions} onChange={(event) => setDeductions(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !basic || !reason.trim()} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await createSalaryStructure(employeeId, {
                effectiveFrom,
                basicMonthly: Number(basic),
                hraMonthly: hra ? Number(hra) : undefined,
                allowancesMonthly: allowances ? Number(allowances) : undefined,
                recurringDeductionsMonthly: deductions ? Number(deductions) : undefined,
                reason: reason.trim()
              });
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save salary structure.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function formatTenure(joiningDate: string) {
  const start = new Date(joiningDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "Starts " + start.toLocaleDateString();
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} mo`;
  return `${years} yr ${remMonths} mo`;
}

function EditContactModal({ employee, onClose, onSaved }: { employee: Employee; onClose: () => void; onSaved: (employee: Employee) => void }) {
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Edit contact info</h2>
        <label className="field">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              const next = await updateEmployeeBasic(employee.id, phone);
              onSaved(next);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save changes.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function EditJobDetailsModal({ employee, onClose, onSaved }: { employee: Employee; onClose: () => void; onSaved: (employee: Employee) => void }) {
  const [designation, setDesignation] = useState(employee.designation ?? "");
  const [location, setLocation] = useState(employee.location ?? "");
  const [employmentType, setEmploymentType] = useState(employee.employmentType ?? "Full-time");
  const [managerId, setManagerId] = useState(employee.managerId ? String(employee.managerId) : "");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [candidates, setCandidates] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees({ status: "Active", size: 100 }).then((result) => setCandidates(result.data.items.filter((e) => e.id !== employee.id))).catch(() => undefined);
  }, [employee.id]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Update job details</h2>
        <p className="modal-sub">Sensitive changes are recorded in the immutable job history and require a reason.</p>
        <div className="form-grid">
          <label className="field">Designation<input value={designation} onChange={(event) => setDesignation(event.target.value)} /></label>
          <label className="field">Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="field">
            Employment type
            <select value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
              {["Full-time", "Part-time", "Contract", "Intern"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            Manager
            <select value={managerId} onChange={(event) => setManagerId(event.target.value)}>
              <option value="">No manager</option>
              {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="field">Effective date<input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: 14 }}>Reason (required)<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting} onClick={async () => {
            if (!reason.trim()) {
              setError("A reason is required.");
              return;
            }
            setSubmitting(true);
            setError(null);
            try {
              const next = await updateEmployeeJobDetails(employee.id, {
                designation: designation || undefined,
                location: location || undefined,
                employmentType: employmentType || undefined,
                managerId: managerId ? Number(managerId) : undefined,
                effectiveDate,
                reason: reason.trim()
              });
              onSaved(next);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save changes.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

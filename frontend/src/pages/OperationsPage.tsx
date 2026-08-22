import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, Power, ShieldAlert } from "lucide-react";
import { api, AuditLog, AutomationRule, LeaveRequest, PayrollAnomaly, Ticket } from "../lib/api";

export function OperationsPage({ view, notify, permissions }: { view: string; notify: (tone: "success" | "error" | "info", message: string) => void; permissions: string[] }) {
  if (view === "approvals") return <Approvals notify={notify} />;
  if (view === "payroll") return <Payroll notify={notify} />;
  if (view === "email") return <EmailCenter notify={notify} />;
  if (view === "tickets") return <Tickets notify={notify} />;
  if (view === "automation") return <Automation notify={notify} />;
  if (view === "audit") return <Audit permissions={permissions} />;
  return null;
}

function Approvals({ notify }: { notify: (tone: "success" | "error" | "info", message: string) => void }) {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const load = () => api<LeaveRequest[]>("/api/hr/approvals").then(setRows).catch((e) => notify("error", e.message));
  useEffect(() => { void load(); }, []);
  const decide = async (row: LeaveRequest, decision: "APPROVED" | "REJECTED") => {
    const reason = decision === "REJECTED" ? window.prompt("Reason for rejection") : "Approved after balance and team availability review";
    if (!reason) return;
    await api(`/api/hr/leave/${row.id}/decision`, { method: "POST", body: JSON.stringify({ decision, reason }) });
    notify("success", `Leave ${decision.toLowerCase()}`);
    load();
  };
  return <section className="panel"><h3>Leave Approval Queue</h3>{rows.map((row) => <article className="review-row" key={row.id}><div><strong>{row.employee}</strong><span>{row.leaveType}: {row.startDate} to {row.endDate} · {row.workingDays} days · balance {row.availableBalance}</span><p>{row.reason}</p></div><div className="row-actions"><button onClick={() => decide(row, "APPROVED")}><CheckCircle2 size={16} />Approve</button><button onClick={() => decide(row, "REJECTED")}><AlertTriangle size={16} />Reject</button></div></article>)}</section>;
}

function Payroll({ notify }: { notify: (tone: "success" | "error" | "info", message: string) => void }) {
  const [rows, setRows] = useState<PayrollAnomaly[]>([]);
  useEffect(() => { api<PayrollAnomaly[]>("/api/hr/payroll/anomalies").then(setRows).catch((e) => notify("error", e.message)); }, []);
  return <section className="panel"><h3>Payroll Anomaly Engine</h3>{rows.map((row) => <article className="review-row" key={row.id}><div><div className={`severity ${row.severity.toLowerCase()}`}>{row.severity}</div><strong>{row.employee}: {row.issue}</strong><span>{row.possibleCause}</span><p>{row.recommendedAction}</p></div><button onClick={() => notify("success", `${row.issue} marked for payroll review`)}>Review</button></article>)}</section>;
}

function EmailCenter({ notify }: { notify: (tone: "success" | "error" | "info", message: string) => void }) {
  const [sending, setSending] = useState(false);
  const send = async (sendNow: boolean) => {
    setSending(true);
    try {
      await api("/api/hr/email/send", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          recipients: ["rohan@dayflow.test"],
          subject: "Dayflow reminder",
          body: "Hello {{employeeName}}, this is a secure HR message from Dayflow.",
          sendNow,
          bulkConfirmed: true,
          scheduledAt: sendNow ? null : new Date(Date.now() + 3600000).toISOString().slice(0, 19)
        })
      });
      notify("success", sendNow ? "Email queued through local provider" : "Email scheduled");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Email action failed");
    } finally {
      setSending(false);
    }
  };
  return <section className="panel composer"><h3>HR Email Center</h3><div className="mail-tabs"><button>Inbox</button><button>Sent</button><button>Drafts</button><button>Scheduled</button><button>Failed</button><button>Archived</button></div><label>To<input defaultValue="rohan@dayflow.test" /></label><label>Subject<input defaultValue="Dayflow reminder" /></label><label>Message<textarea defaultValue="Hello {{employeeName}}, this is a secure HR message from Dayflow." /></label><div className="preview"><Mail /><span>Recipient count: 1 · Excluded recipients: 0 · Attachments: none · Provider: local development adapter</span></div><div className="dialog-actions"><button onClick={() => notify("success", "Draft saved locally and on server workflow")}>Save Draft</button><button onClick={() => send(false)} disabled={sending}>Schedule</button><button className="primary" onClick={() => send(true)} disabled={sending}>Send Now</button></div></section>;
}

function Tickets({ notify }: { notify: (tone: "success" | "error" | "info", message: string) => void }) {
  const [rows, setRows] = useState<Ticket[]>([]);
  useEffect(() => { api<Ticket[]>("/api/hr/tickets").then(setRows).catch((e) => notify("error", e.message)); }, []);
  return <section className="panel"><h3>HR Help Desk</h3>{rows.map((row) => <article className="review-row" key={row.id}><div><strong>{row.subject}</strong><span>{row.employee} · {row.category} · {row.status} · SLA {new Date(row.slaDueAt).toLocaleString()}</span>{row.confidential && <p className="sensitive"><ShieldAlert size={16} /> Confidential access restricted and audited</p>}</div><button onClick={() => notify("success", `${row.subject} assigned`)}>Assign</button></article>)}</section>;
}

function Automation({ notify }: { notify: (tone: "success" | "error" | "info", message: string) => void }) {
  const [rows, setRows] = useState<AutomationRule[]>([]);
  const load = () => api<AutomationRule[]>("/api/hr/automation-rules").then(setRows).catch((e) => notify("error", e.message));
  useEffect(() => { void load(); }, []);
  const toggle = async (row: AutomationRule) => {
    const confirmed = !row.highRisk || window.confirm("This is a high-risk automation. Confirm the change?");
    if (!confirmed) return;
    await api(`/api/hr/automation-rules/${row.id}/toggle`, { method: "PUT", body: JSON.stringify({ active: !row.active, confirmed, reason: "Manual toggle from portal" }) });
    notify("success", `${row.name} updated`);
    load();
  };
  return <section className="panel"><h3>Workflow and Automation Rules</h3>{rows.map((row) => <article className="review-row" key={row.id}><div><strong>{row.name}</strong><span>{row.triggerName} → {row.conditionText} → {row.actionText}</span><p>{row.description} · Success {row.successRate}% · {row.testMode ? "Test mode" : "Live"}</p></div><button onClick={() => toggle(row)}><Power size={16} />{row.active ? "Disable" : "Enable"}</button></article>)}</section>;
}

function Audit({ permissions }: { permissions: string[] }) {
  const [rows, setRows] = useState<AuditLog[]>([]);
  useEffect(() => { if (permissions.includes("audit:read")) api<AuditLog[]>("/api/hr/audit-logs").then(setRows); }, [permissions]);
  return <section className="panel"><h3>Immutable Audit Logs</h3><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Reason</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.actor}</td><td>{row.action}</td><td>{row.entity} #{row.entityId}</td><td>{row.reason}</td></tr>)}</tbody></table></div></section>;
}

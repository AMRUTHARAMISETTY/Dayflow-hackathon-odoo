import { Fragment, useEffect, useState } from "react";
import {
  type ComposeEmailPayload, fetchDepartments, fetchEmailDeliveries, fetchEmailMessages, fetchEmailTemplates,
  previewEmail, sendEmail, sendTestEmail
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Department, EmailDelivery, EmailMessage, EmailTemplate, RecipientPreview } from "../lib/types";

type RecipientMode = "all" | "department" | "specific";

export function EmailPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<"compose" | "sent">(can("email:send") ? "compose" : "sent");

  return (
    <>
      <div className="tab-bar" role="tablist">
        {can("email:send") && <button role="tab" className={tab === "compose" ? "active" : ""} onClick={() => setTab("compose")}>Compose</button>}
        {can("email:read") && <button role="tab" className={tab === "sent" ? "active" : ""} onClick={() => setTab("sent")}>Sent</button>}
      </div>
      {tab === "compose" && can("email:send") && <ComposeTab />}
      {tab === "sent" && can("email:read") && <SentTab />}
    </>
  );
}

function ComposeTab() {
  const { can } = useAuth();
  const notify = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [mode, setMode] = useState<RecipientMode>("department");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [employeeIds, setEmployeeIds] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<RecipientPreview | null>(null);
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmailTemplates().then(setTemplates).catch(() => undefined);
    fetchDepartments().then(setDepartments).catch(() => undefined);
  }, []);

  const applyTemplate = (id: number | "") => {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const buildPayload = (): ComposeEmailPayload => ({
    templateId: templateId === "" ? null : templateId,
    recipients: {
      allActive: mode === "all",
      departmentId: mode === "department" && departmentId !== "" ? Number(departmentId) : null,
      employeeIds: mode === "specific" ? employeeIds.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n) && n > 0) : []
    },
    subject,
    body,
    bulkConfirmed
  });

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await previewEmail(buildPayload());
      setPreview(result);
      setBulkConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not preview recipients.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendEmail(buildPayload());
      notify("success", "Email sent.");
      setPreview(null);
      setSubject("");
      setBody("");
      setBulkConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this email.");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendTestEmail(buildPayload());
      notify("success", "Test email sent to your own inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send test email.");
    } finally {
      setBusy(false);
    }
  };

  const canSend = subject.trim() && body.trim() && (!preview || !preview.requiresBulkConfirmation || bulkConfirmed);

  return (
    <div className="grid-two">
      <div className="panel">
        <h3>Compose</h3>
        <div className="form-grid">
          <label className="field">Template (optional)
            <select value={templateId} onChange={(event) => applyTemplate(event.target.value === "" ? "" : Number(event.target.value))}>
              <option value="">Blank</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field">Recipients
            <select value={mode} onChange={(event) => { setMode(event.target.value as RecipientMode); setPreview(null); }}>
              <option value="department">By department</option>
              <option value="all">All active employees</option>
              <option value="specific">Specific employee IDs</option>
            </select>
          </label>
        </div>

        {mode === "department" && (
          <label className="field" style={{ marginTop: 10 }}>Department
            <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value === "" ? "" : Number(event.target.value)); setPreview(null); }}>
              <option value="">Select a department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        )}
        {mode === "specific" && (
          <label className="field" style={{ marginTop: 10 }}>Employee IDs (comma-separated)
            <input value={employeeIds} onChange={(event) => { setEmployeeIds(event.target.value); setPreview(null); }} placeholder="1, 4, 9" />
          </label>
        )}

        <label className="field" style={{ marginTop: 10 }}>Subject<input value={subject} onChange={(event) => { setSubject(event.target.value); setPreview(null); }} /></label>
        <label className="field" style={{ marginTop: 10 }}>Body (supports {"{{employee_name}}"}, {"{{department}}"}, {"{{designation}}"} etc.)
          <textarea rows={8} value={body} onChange={(event) => { setBody(event.target.value); setPreview(null); }} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
          <button className="secondary" disabled={busy || !subject.trim() || !body.trim()} onClick={runPreview}>Preview recipients</button>
          {can("email:send") && <button className="secondary" disabled={busy || !subject.trim() || !body.trim()} onClick={sendTest}>Send test to myself</button>}
          <button className="primary" disabled={busy || !canSend} onClick={send}>Send</button>
        </div>
      </div>

      <div className="panel">
        <h3>Recipient preview</h3>
        {!preview ? <p className="empty-inline">Run a preview to see who will receive this email and a sample render.</p> : (
          <>
            <p><strong>{preview.recipientCount}</strong> recipient(s)</p>
            {preview.sampleNames.length > 0 && <p className="empty-inline">Including: {preview.sampleNames.join(", ")}{preview.recipientCount > preview.sampleNames.length ? "…" : ""}</p>}
            <p className="empty-inline">From: {preview.senderIdentity}</p>
            <div className="thread-message" style={{ marginTop: 10 }}>
              <div className="thread-meta"><strong>Sample subject</strong></div>
              <p style={{ margin: 0 }}>{preview.sampleRenderedSubject}</p>
            </div>
            <div className="thread-message" style={{ marginTop: 8 }}>
              <div className="thread-meta"><strong>Sample body</strong></div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{preview.sampleRenderedBody}</p>
            </div>
            {preview.requiresBulkConfirmation && (
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 13 }}>
                <input type="checkbox" checked={bulkConfirmed} onChange={(event) => setBulkConfirmed(event.target.checked)} />
                I've reviewed the {preview.recipientCount} recipients above and confirm this bulk send.
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SentTab() {
  const [messages, setMessages] = useState<EmailMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([]);

  const load = () => {
    fetchEmailMessages().then((result) => setMessages(result.items)).catch((err) => setError(err instanceof Error ? err.message : "Could not load sent email."));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!messages) return <LoadingSkeleton rows={4} />;
  if (messages.length === 0) return <EmptyState title="No email sent yet" />;

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>Subject</th><th>From</th><th>Recipients</th><th>Status</th><th>Sent</th></tr></thead>
        <tbody>
          {messages.map((message) => (
            <Fragment key={message.id}>
              <tr className="clickable" onClick={async () => {
                if (expanded === message.id) { setExpanded(null); return; }
                setExpanded(message.id);
                setDeliveries(await fetchEmailDeliveries(message.id));
              }}>
                <td data-label="Subject">{message.subject}</td>
                <td data-label="From">{message.senderName}</td>
                <td data-label="Recipients">{message.recipientCount}</td>
                <td data-label="Status"><span className={`status-pill ${message.status === "SENT" ? "active" : message.status === "FAILED" ? "suspended" : "pending"}`}>{message.status}</span></td>
                <td data-label="Sent">{message.sentAt ? new Date(message.sentAt).toLocaleString() : message.scheduledAt ? `Scheduled: ${new Date(message.scheduledAt).toLocaleString()}` : "—"}</td>
              </tr>
              {expanded === message.id && (
                <tr>
                  <td colSpan={5}>
                    <div className="thread">
                      {deliveries.map((delivery) => (
                        <div key={delivery.id} className="thread-message">
                          <div className="thread-meta">
                            <strong>{delivery.employeeName} &lt;{delivery.emailAddress}&gt;</strong>
                            <span className={`status-pill ${delivery.status === "SENT" ? "active" : delivery.status === "FAILED" ? "suspended" : "pending"}`}>{delivery.status}</span>
                          </div>
                          {delivery.errorMessage && <p style={{ margin: 0, color: "var(--danger)" }}>{delivery.errorMessage}</p>}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

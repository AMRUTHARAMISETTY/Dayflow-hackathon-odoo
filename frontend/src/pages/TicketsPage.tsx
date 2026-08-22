import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  addTicketMessage, assignTicket, createTicket, escalateTicket, fetchAssignableStaff, fetchTicket, fetchTicketMessages,
  fetchTickets, rateTicket, updateTicketStatus
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { AssignableStaff, HrTicket, HrTicketMessage, TicketStatus } from "../lib/types";

const CATEGORIES = ["IT Support", "Payroll Query", "Leave & Attendance", "Facilities", "General Query", "Confidential Grievance"];
const STATUSES: TicketStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];

export function TicketsPage() {
  const { can } = useAuth();
  const notify = useToast();
  const [tickets, setTickets] = useState<HrTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setError(null);
    fetchTickets({ status: status || undefined })
      .then((result) => setTickets(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load tickets."));
  };
  useEffect(load, [status]);

  if (selectedId) {
    return <TicketDetail id={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!tickets) return <LoadingSkeleton rows={4} />;

  return (
    <>
      <div className="toolbar">
        {can("ticket:read") && (
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        )}
        <div className="spacer" />
        <button className="primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />New ticket
        </button>
      </div>

      {tickets.length === 0 ? <EmptyState title="No tickets" description="Nothing here yet." /> : (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>SLA due</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="clickable" onClick={() => setSelectedId(ticket.id)}>
                  <td data-label="Subject">{ticket.subject}{ticket.confidential && <span className="confidential-tag" style={{ marginLeft: 6 }}>Confidential</span>}</td>
                  <td data-label="Category">{ticket.category}</td>
                  <td data-label="Priority"><span className={`priority-pill ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                  <td data-label="Status"><span className="status-pill pending">{ticket.status.replace(/_/g, " ")}</span></td>
                  <td data-label="Assigned to">{ticket.assignedToName ?? "—"}</td>
                  <td data-label="SLA due">{new Date(ticket.slaDueAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); notify("success", "Ticket raised."); load(); setSelectedId(id); }} />
      )}
    </>
  );
}

function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await createTicket({ category, subject, description, confidential: confidential || category === "Confidential Grievance" });
      onCreated(ticket.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not raise this ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>New HR ticket</h2>
        <div className="form-grid">
          <label className="field">Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>Description<textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {category !== "Confidential Grievance" && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 13 }}>
            <input type="checkbox" checked={confidential} onChange={(event) => setConfidential(event.target.checked)} />
            Keep this confidential — only visible to HR Admin and whoever it's assigned to
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !subject.trim() || !description.trim()} onClick={submit}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { can, user } = useAuth();
  const notify = useToast();
  const [ticket, setTicket] = useState<HrTicket | null>(null);
  const [messages, setMessages] = useState<HrTicketMessage[]>([]);
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);

  const load = () => {
    setError(null);
    Promise.all([
      fetchTicket(id),
      fetchTicketMessages(id),
      can("ticket:manage") ? fetchAssignableStaff() : Promise.resolve<AssignableStaff[]>([])
    ])
      .then(([t, m, s]) => { setTicket(t); setMessages(m); setStaff(s); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this ticket."));
  };
  useEffect(load, [id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!ticket) return <LoadingSkeleton rows={4} />;

  const isOwner = user?.employeeId === ticket.employeeId;

  return (
    <>
      <button className="link" onClick={onBack} style={{ marginBottom: 12 }}>&larr; All tickets</button>
      <div className="profile-header">
        <div style={{ flex: 1 }}>
          <h1>{ticket.subject}{ticket.confidential && <span className="confidential-tag" style={{ marginLeft: 8 }}>Confidential</span>}</h1>
          <p className="designation">{ticket.category} &middot; <span className={`priority-pill ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span> &middot; <span className="status-pill pending">{ticket.status.replace(/_/g, " ")}</span></p>
          <p style={{ marginTop: 10 }}>{ticket.description}</p>
          <div className="profile-meta">
            <div><span>Raised by</span>{ticket.employeeName}</div>
            <div><span>Assigned to</span>{ticket.assignedToName ?? "Unassigned"}</div>
            <div><span>SLA due</span>{new Date(ticket.slaDueAt).toLocaleString()}</div>
            <div><span>Rating</span>{ticket.satisfactionRating ? `${ticket.satisfactionRating}/5` : "—"}</div>
          </div>
        </div>
        <div className="profile-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          {can("ticket:manage") && staff.length > 0 && (
            <select disabled={busy} defaultValue="" onChange={async (event) => {
              const staffId = Number(event.target.value);
              if (!staffId) return;
              setBusy(true);
              try {
                await assignTicket(ticket.id, staffId);
                notify("success", "Ticket assigned.");
                load();
              } catch (err) {
                notify("error", err instanceof Error ? err.message : "Could not assign this ticket.");
              } finally {
                setBusy(false);
              }
            }}>
              <option value="">Assign to…</option>
              {staff.filter((s) => !ticket.confidential || s.canHandleConfidential).map((s) => (
                <option key={s.userId} value={s.userId}>{s.name} ({s.roleName})</option>
              ))}
            </select>
          )}
          {can("ticket:manage") && (
            <select disabled={busy} value={ticket.status} onChange={async (event) => {
              setBusy(true);
              try {
                await updateTicketStatus(ticket.id, event.target.value);
                notify("success", "Status updated.");
                load();
              } catch (err) {
                notify("error", err instanceof Error ? err.message : "Could not update status.");
              } finally {
                setBusy(false);
              }
            }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          )}
          {can("ticket:manage") && ticket.priority !== "CRITICAL" && (
            <button className="secondary" disabled={busy} onClick={async () => {
              setBusy(true);
              try {
                await escalateTicket(ticket.id);
                notify("success", "Ticket escalated.");
                load();
              } catch (err) {
                notify("error", err instanceof Error ? err.message : "Could not escalate this ticket.");
              } finally {
                setBusy(false);
              }
            }}>Escalate priority</button>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Conversation</h3>
        <div className="thread">
          {messages.length === 0 ? <p className="empty-inline">No messages yet.</p> : messages.map((message) => (
            <div key={message.id} className={`thread-message${message.internalNote ? " internal" : ""}`}>
              <div className="thread-meta">
                <strong>{message.authorName}{message.internalNote ? " (internal note)" : ""}</strong>
                <span>{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ margin: 0 }}>{message.body}</p>
            </div>
          ))}
        </div>
        <label className="field">Reply<textarea rows={3} value={reply} onChange={(event) => setReply(event.target.value)} /></label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          {can("ticket:manage") ? (
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} />
              Internal note (hidden from {ticket.employeeName})
            </label>
          ) : <span />}
          <button className="primary" disabled={busy || !reply.trim()} onClick={async () => {
            setBusy(true);
            try {
              await addTicketMessage(ticket.id, reply.trim(), internalNote);
              setReply("");
              setInternalNote(false);
              load();
            } catch (err) {
              notify("error", err instanceof Error ? err.message : "Could not send this reply.");
            } finally {
              setBusy(false);
            }
          }}>Send</button>
        </div>
      </div>

      {isOwner && ["RESOLVED", "CLOSED"].includes(ticket.status) && !ticket.satisfactionRating && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Rate this resolution</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
            <button className="primary" disabled={busy} onClick={async () => {
              setBusy(true);
              try {
                await rateTicket(ticket.id, rating);
                notify("success", "Thanks for the feedback.");
                load();
              } catch (err) {
                notify("error", err instanceof Error ? err.message : "Could not submit rating.");
              } finally {
                setBusy(false);
              }
            }}>Submit rating</button>
          </div>
        </div>
      )}
    </>
  );
}

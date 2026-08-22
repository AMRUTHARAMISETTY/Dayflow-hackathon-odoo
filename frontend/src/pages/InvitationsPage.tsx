import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { createInvitation, fetchInvitations, fetchRoles, revokeInvitation } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { InvitationView, Role } from "../lib/types";

export function InvitationsPage() {
  const { can } = useAuth();
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ items: InvitationView[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchInvitations(status || undefined)
      .then((res) => setResult({ items: res.items, total: res.total }))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load invitations."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);
  useEffect(() => { if (can("role:read")) fetchRoles().then(setRoles).catch(() => undefined); }, [can]);

  const showCreate = params.get("create") === "1";

  return (
    <>
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>
        <div className="spacer" />
        {can("invitation:write") && (
          <button className="primary" onClick={() => setParams({ create: "1" })}><Plus size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />Invite someone</button>
        )}
      </div>

      {lastLink && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3>Invitation link (Phase 1 stand-in for email delivery)</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Share this link directly. It expires in 72 hours and can only be used once.</p>
          <div className="copy-box">{window.location.origin}{lastLink}</div>
        </div>
      )}

      {loading && !result && <LoadingSkeleton rows={5} />}
      {error && !result && <ErrorState message={error} onRetry={load} />}
      {result && result.items.length === 0 && <EmptyState title="No invitations yet" description="Invite an HR, Manager, Payroll or Auditor account — public sign-up only ever creates Employee accounts." />}
      {result && result.items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Invited by</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {result.items.map((inv) => (
                <tr key={inv.id}>
                  <td data-label="Email">{inv.email}</td>
                  <td data-label="Role">{inv.roleName.replace(/_/g, " ")}</td>
                  <td data-label="Status"><span className={`status-pill ${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                  <td data-label="Invited by">{inv.invitedByName}</td>
                  <td data-label="Expires">{new Date(inv.expiresAt).toLocaleString()}</td>
                  <td data-label="">
                    {inv.status === "PENDING" && can("invitation:write") && (
                      <button className="secondary" onClick={async () => {
                        try {
                          await revokeInvitation(inv.id);
                          notify("success", "Invitation revoked.");
                          load();
                        } catch (err) {
                          notify("error", err instanceof Error ? err.message : "Could not revoke invitation.");
                        }
                      }}>Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateInvitationModal
          roles={roles}
          onClose={() => setParams({})}
          onCreated={(acceptPath) => {
            setParams({});
            setLastLink(acceptPath);
            notify("success", "Invitation created.");
            load();
          }}
        />
      )}
    </>
  );
}

function CreateInvitationModal({ roles, onClose, onCreated }: { roles: Role[]; onClose: () => void; onCreated: (acceptPath: string) => void }) {
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState(roles.find((r) => r.name !== "EMPLOYEE")?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Invite someone</h2>
        <p className="modal-sub">They'll set their own password when accepting. Nobody can grant themselves this access any other way.</p>
        <label className="field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field" style={{ marginTop: 12 }}>
          Role
          <select value={roleName} onChange={(event) => setRoleName(event.target.value)}>
            {roles.map((role) => <option key={role.id} value={role.name}>{role.name.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !email || !roleName} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              const created = await createInvitation(email.trim(), roleName);
              onCreated(created.acceptPath);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create invitation.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Sending…" : "Create invitation"}</button>
        </div>
      </div>
    </div>
  );
}

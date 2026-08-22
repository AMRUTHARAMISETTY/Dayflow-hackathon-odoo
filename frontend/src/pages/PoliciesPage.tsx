import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { archivePolicy, createPolicy, fetchPolicies, updatePolicy } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Policy } from "../lib/types";

export function PoliciesPage() {
  const { can } = useAuth();
  const notify = useToast();
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Policy | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setError(null);
    fetchPolicies(category || undefined)
      .then(setPolicies)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load policies."));
  };
  useEffect(load, [category]);

  const categories = Array.from(new Set((policies ?? []).map((p) => p.category)));

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!policies) return <LoadingSkeleton rows={4} />;

  return (
    <>
      <div className="toolbar">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="spacer" />
        {can("policy:manage") && (
          <button className="primary" onClick={() => setCreating(true)}>
            <Plus size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />New policy
          </button>
        )}
      </div>

      {policies.length === 0 ? <EmptyState title="No policies yet" /> : (
        <div className="policy-list">
          {policies.map((policy) => (
            <div key={policy.id} className="policy-item">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <h3>{policy.title}</h3>
                  <p className="meta">{policy.category} &middot; effective {new Date(policy.effectiveDate).toLocaleDateString()}</p>
                </div>
                {can("policy:manage") && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="secondary" onClick={() => setEditing(policy)}>Edit</button>
                    <button className="secondary" onClick={async () => {
                      try {
                        await archivePolicy(policy.id);
                        notify("success", "Policy archived.");
                        load();
                      } catch (err) {
                        notify("error", err instanceof Error ? err.message : "Could not archive policy.");
                      }
                    }}>Archive</button>
                  </div>
                )}
              </div>
              <p className="body-text">{policy.body}</p>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PolicyModal
          policy={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); notify("success", "Policy saved."); load(); }}
        />
      )}
    </>
  );
}

function PolicyModal({ policy, onClose, onSaved }: { policy: Policy | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(policy?.code ?? "");
  const [title, setTitle] = useState(policy?.title ?? "");
  const [category, setCategory] = useState(policy?.category ?? "");
  const [body, setBody] = useState(policy?.body ?? "");
  const [effectiveDate, setEffectiveDate] = useState(policy?.effectiveDate ?? new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (policy) {
        await updatePolicy(policy.id, { title, category, body, effectiveDate });
      } else {
        await createPolicy({ code, title, category, body, effectiveDate });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this policy.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>{policy ? "Edit policy" : "New policy"}</h2>
        <div className="form-grid">
          {!policy && (
            <label className="field">Code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="REMOTE_WORK_POLICY" /></label>
          )}
          <label className="field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="field">Category<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
          <label className="field">Effective date<input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>Body<textarea rows={6} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !title || !category || !body || (!policy && !code)} onClick={submit}>
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

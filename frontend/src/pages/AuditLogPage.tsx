import { Fragment, useEffect, useState } from "react";
import { fetchAuditLogs } from "../lib/api";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { AuditLogEntry } from "../lib/types";

const PAGE_SIZE = 25;

export function AuditLogPage() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ items: AuditLogEntry[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAuditLogs({ entity: entity || undefined, action: action || undefined, page, size: PAGE_SIZE })
      .then((res) => setResult({ items: res.items, total: res.total }))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the audit log."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [entity, action, page]);

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <div className="toolbar">
        <select value={entity} onChange={(event) => { setEntity(event.target.value); setPage(0); }} aria-label="Entity">
          <option value="">All entities</option>
          <option value="Employee">Employee</option>
          <option value="User">User</option>
          <option value="Invitation">Invitation</option>
          <option value="Department">Department</option>
        </select>
        <select value={action} onChange={(event) => { setAction(event.target.value); setPage(0); }} aria-label="Action">
          <option value="">All actions</option>
          <option value="LOGIN">Login</option>
          <option value="REGISTER">Register</option>
          <option value="CREATE_EMPLOYEE">Create employee</option>
          <option value="UPDATE_EMPLOYEE_JOB">Update job details</option>
          <option value="CREATE_INVITATION">Create invitation</option>
          <option value="ACCEPT_INVITATION">Accept invitation</option>
        </select>
      </div>

      {loading && !result && <LoadingSkeleton rows={6} />}
      {error && !result && <ErrorState message={error} onRetry={load} />}
      {result && result.items.length === 0 && <EmptyState title="No audit events match these filters" />}
      {result && result.items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Reason</th></tr>
            </thead>
            <tbody>
              {result.items.map((entry) => (
                <Fragment key={entry.id}>
                  <tr className="clickable" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                    <td data-label="When">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td data-label="Actor">{entry.actorName}</td>
                    <td data-label="Action">{entry.action.replace(/_/g, " ")}</td>
                    <td data-label="Entity">{entry.entity}{entry.entityId ? ` #${entry.entityId}` : ""}</td>
                    <td data-label="Reason">{entry.reason ?? "—"}</td>
                  </tr>
                  {expanded === entry.id && (entry.previousValue || entry.newValue) && (
                    <tr>
                      <td colSpan={5}>
                        <div className="form-grid" style={{ fontSize: 12 }}>
                          <div><strong>Before</strong><pre style={{ whiteSpace: "pre-wrap" }}>{entry.previousValue ?? "—"}</pre></div>
                          <div><strong>After</strong><pre style={{ whiteSpace: "pre-wrap" }}>{entry.newValue ?? "—"}</pre></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.total > 0 && (
        <div className="pagination">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="controls">
            <button className="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </>
  );
}

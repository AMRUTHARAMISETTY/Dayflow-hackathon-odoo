import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Plus, UserRound } from "lucide-react";
import { createEmployee, fetchDepartments, fetchEmployees } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton, StaleDataBanner } from "../components/StateViews";
import type { Department, Employee } from "../lib/types";

const STATUSES = ["Onboarding", "Pending Profile", "Active", "Suspended", "Archived"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern"];
const PAGE_SIZE = 20;

export function EmployeesPage() {
  const { can } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const q = params.get("q") ?? "";
  const departmentId = params.get("departmentId") ?? "";
  const status = params.get("status") ?? "";
  const employmentType = params.get("employmentType") ?? "";
  const location = params.get("location") ?? "";
  const sort = params.get("sort") ?? "name";
  const direction = params.get("direction") ?? "asc";
  const page = Number(params.get("page") ?? "0");
  const view = (params.get("view") ?? "table") as "table" | "grid";

  const [page_, setPageData] = useState<{ items: Employee[]; total: number } | null>(null);
  const [stale, setStale] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetchEmployees({
      q: q || undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      status: status || undefined,
      employmentType: employmentType || undefined,
      location: location || undefined,
      sort,
      direction,
      page,
      size: PAGE_SIZE
    })
      .then((result) => {
        setPageData({ items: result.data.items, total: result.data.total });
        setStale(result.stale);
        setAsOf(result.asOf);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the employee directory."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [q, departmentId, status, employmentType, location, sort, direction, page]);

  useEffect(() => {
    if (can("department:read")) {
      fetchDepartments().then(setDepartments).catch(() => undefined);
    }
  }, [can]);

  const toggleSort = (column: string) => {
    if (sort === column) setParam("direction", direction === "asc" ? "desc" : "asc");
    else {
      const next = new URLSearchParams(params);
      next.set("sort", column);
      next.set("direction", "asc");
      next.delete("page");
      setParams(next, { replace: true });
    }
  };

  const showCreate = params.get("create") === "1";
  const closeCreate = () => setParam("create", "");

  const total = page_?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {stale && <StaleDataBanner asOf={asOf} />}
      <div className="toolbar">
        <label className="field" style={{ minWidth: 220 }}>
          <span className="sr-only" />
          <input placeholder="Search name, email, code…" value={q} onChange={(event) => setParam("q", event.target.value)} aria-label="Search employees" />
        </label>
        {departments.length > 0 && (
          <select aria-label="Department" value={departmentId} onChange={(event) => setParam("departmentId", event.target.value)}>
            <option value="">All departments</option>
            {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
        )}
        <select aria-label="Status" value={status} onChange={(event) => setParam("status", event.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Employment type" value={employmentType} onChange={(event) => setParam("employmentType", event.target.value)}>
          <option value="">All employment types</option>
          {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {departments.length > 0 && (
          <select aria-label="Location" value={location} onChange={(event) => setParam("location", event.target.value)}>
            <option value="">All locations</option>
            {[...new Set(departments.map((d) => d.location))].map((loc) => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        )}
        <div className="spacer" />
        <div className="view-toggle">
          <button className={view === "table" ? "active" : ""} aria-label="Table view" onClick={() => setParam("view", "table")}><List size={16} /></button>
          <button className={view === "grid" ? "active" : ""} aria-label="Grid view" onClick={() => setParam("view", "grid")}><LayoutGrid size={16} /></button>
        </div>
        {can("employee:write") && (
          <button className="primary" onClick={() => setParam("create", "1")}><Plus size={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />Add employee</button>
        )}
      </div>

      {loading && !page_ && <LoadingSkeleton rows={6} />}
      {error && !page_ && <ErrorState message={error} onRetry={load} />}
      {page_ && page_.items.length === 0 && (
        <EmptyState icon={<UserRound size={32} />} title="No employees match these filters" description="Try adjusting search or filters, or add a new employee." />
      )}
      {page_ && page_.items.length > 0 && view === "table" && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <SortableHeader label="Name" column="name" sort={sort} direction={direction} onSort={toggleSort} />
                <SortableHeader label="Department" column="department" sort={sort} direction={direction} onSort={toggleSort} />
                <th>Designation</th>
                <th>Location</th>
                <SortableHeader label="Status" column="status" sort={sort} direction={direction} onSort={toggleSort} />
                <SortableHeader label="Joined" column="joiningDate" sort={sort} direction={direction} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {page_.items.map((employee) => (
                <tr key={employee.id} className="clickable" onClick={() => navigate(`/employees/${employee.id}`)}>
                  <td data-label="Name"><strong>{employee.name}</strong><div style={{ fontSize: 12, color: "var(--text-faint)" }}>{employee.employeeCode ?? "—"}</div></td>
                  <td data-label="Department">{employee.departmentName ?? "—"}</td>
                  <td data-label="Designation">{employee.designation ?? "—"}</td>
                  <td data-label="Location">{employee.location ?? "—"}</td>
                  <td data-label="Status"><StatusPill status={employee.status} /></td>
                  <td data-label="Joined">{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page_ && page_.items.length > 0 && view === "grid" && (
        <div className="card-grid">
          {page_.items.map((employee) => (
            <div className="entity-card" key={employee.id} onClick={() => navigate(`/employees/${employee.id}`)}>
              <div className="row">
                <span className="avatar">{employee.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}</span>
                <div>
                  <div className="name">{employee.name}</div>
                  <div className="meta">{employee.designation ?? "—"}</div>
                </div>
              </div>
              <div className="meta">{employee.departmentName ?? "—"} · {employee.location ?? "—"}</div>
              <StatusPill status={employee.status} />
            </div>
          ))}
        </div>
      )}

      {page_ && total > 0 && (
        <div className="pagination">
          <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
          <div className="controls">
            <button className="secondary" disabled={page === 0} onClick={() => setParams((prev) => { const n = new URLSearchParams(prev); n.set("page", String(page - 1)); return n; })}>Previous</button>
            <button className="secondary" disabled={page + 1 >= totalPages} onClick={() => setParams((prev) => { const n = new URLSearchParams(prev); n.set("page", String(page + 1)); return n; })}>Next</button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateEmployeeModal
          departments={departments}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            notify("success", "Employee created. Send them a secure invitation from their profile when ready.");
            load();
          }}
        />
      )}
    </>
  );
}

function SortableHeader({ label, column, sort, direction, onSort }: { label: string; column: string; sort: string; direction: string; onSort: (c: string) => void }) {
  const active = sort === column;
  return (
    <th className="sortable" onClick={() => onSort(column)} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      {label}{active ? (direction === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill ${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span>;
}

function CreateEmployeeModal({ departments, onClose, onCreated }: { departments: Department[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designation, setDesignation] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [joiningDate, setJoiningDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createEmployee({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        designation: designation.trim() || undefined,
        location: location.trim() || undefined,
        employmentType,
        joiningDate: joiningDate || undefined
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this employee.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Add employee</h2>
        <p className="modal-sub">Creates an HR record. They still need a separate invitation to sign in.</p>
        <div className="form-grid">
          <label className="field">Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label className="field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className="field">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label className="field">
            Department
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">Unassigned</option>
              {departments.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
            </select>
          </label>
          <label className="field">Designation<input value={designation} onChange={(event) => setDesignation(event.target.value)} /></label>
          <label className="field">Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          <label className="field">
            Employment type
            <select value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">Joining date<input type="date" value={joiningDate} onChange={(event) => setJoiningDate(event.target.value)} /></label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" onClick={submit} disabled={submitting}>{submitting ? "Creating…" : "Create employee"}</button>
        </div>
      </div>
    </div>
  );
}

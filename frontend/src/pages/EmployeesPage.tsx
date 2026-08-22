import { FormEvent, useEffect, useState } from "react";
import { Download, Grid2X2, ListFilter, MailPlus, Plus, Table2 } from "lucide-react";
import { api, Employee, Page } from "../lib/api";

export function EmployeesPage({ notify }: { notify: (tone: "success" | "error" | "info", message: string) => void }) {
  const [data, setData] = useState<Page<Employee> | null>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [grid, setGrid] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api<Page<Employee>>(`/api/hr/employees?q=${encodeURIComponent(query)}&department=${encodeURIComponent(department)}`));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Could not load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page-grid">
      <section className="toolbar">
        <label className="search wide"><ListFilter size={18} /><input placeholder="Search by name, email, or ID" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} /></label>
        <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Department filter">
          <option value="">All departments</option>
          <option>People Operations</option>
          <option>Engineering</option>
          <option>Finance</option>
        </select>
        <button onClick={load}>Apply</button>
        <button onClick={() => setGrid(!grid)}>{grid ? <Table2 size={18} /> : <Grid2X2 size={18} />}{grid ? "Table" : "Grid"}</button>
        <button onClick={() => notify("success", "Employee export generated")}><Download size={18} />Export</button>
        <button className="primary" onClick={() => setShowForm(true)}><Plus size={18} />Add Employee</button>
      </section>

      {showForm && <EmployeeForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); notify("success", "Employee created and onboarding status started"); }} notify={notify} />}

      <section className="panel">
        <div className="panel-title"><h3>Employee Directory</h3><span>{data?.total ?? 0} records</span></div>
        {loading && <div className="inline-muted">Refreshing employee data...</div>}
        {!loading && data?.items.length === 0 && <div className="empty">No employees match this view.</div>}
        {grid ? (
          <div className="employee-grid">
            {data?.items.map((employee) => <EmployeeCard employee={employee} notify={notify} key={employee.id} />)}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Position</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.items.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.employeeCode}</td>
                    <td><strong>{employee.name}</strong><span>{employee.email}</span></td>
                    <td>{employee.department}</td>
                    <td>{employee.position}</td>
                    <td>{employee.location}</td>
                    <td><span className={`pill ${employee.status.toLowerCase()}`}>{employee.status}</span></td>
                    <td><EmployeeActions employee={employee} notify={notify} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EmployeeCard({ employee, notify }: { employee: Employee; notify: (tone: "success" | "error" | "info", message: string) => void }) {
  return <article className="employee-card"><strong>{employee.name}</strong><span>{employee.position}</span><span>{employee.department} · {employee.location}</span><EmployeeActions employee={employee} notify={notify} /></article>;
}

function EmployeeActions({ employee, notify }: { employee: Employee; notify: (tone: "success" | "error" | "info", message: string) => void }) {
  return (
    <div className="row-actions">
      <button onClick={() => notify("info", `${employee.name}'s profile drawer opened`)}>Profile</button>
      <button onClick={async () => {
        try {
          await api(`/api/hr/employees/${employee.id}/invite`, { method: "POST", body: "{}" });
          notify("success", `Invitation queued for ${employee.name}`);
        } catch (error) {
          notify("error", error instanceof Error ? error.message : "Invitation failed");
        }
      }}><MailPlus size={16} />Invite</button>
    </div>
  );
}

function EmployeeForm({ onClose, onCreated, notify }: { onClose: () => void; onCreated: () => void; notify: (tone: "success" | "error" | "info", message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await api("/api/hr/employees", {
        method: "POST",
        body: JSON.stringify({
          employeeCode: form.get("employeeCode"),
          name: form.get("name"),
          email: form.get("email"),
          department: form.get("department"),
          position: form.get("position"),
          location: form.get("location"),
          employmentType: form.get("employmentType"),
          joiningDate: form.get("joiningDate"),
          salary: Number(form.get("salary"))
        })
      });
      onCreated();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Employee could not be created");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="modal" role="dialog" aria-modal="true">
      <form className="form-panel" onSubmit={submit}>
        <h3>Add Employee</h3>
        <div className="form-grid">
          <label>Employee ID<input name="employeeCode" required placeholder="DF-1005" /></label>
          <label>Name<input name="name" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Department<select name="department"><option>People Operations</option><option>Engineering</option><option>Finance</option></select></label>
          <label>Position<select name="position"><option>HR Business Partner</option><option>Frontend Engineer</option><option>Payroll Specialist</option><option>Product Manager</option></select></label>
          <label>Location<input name="location" required defaultValue="Bengaluru" /></label>
          <label>Employment Type<select name="employmentType"><option>Full-time</option><option>Contract</option><option>Intern</option></select></label>
          <label>Joining Date<input name="joiningDate" type="date" required /></label>
          <label>Salary<input name="salary" type="number" min="0" step="0.01" required /></label>
        </div>
        <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving..." : "Create"}</button></div>
      </form>
    </section>
  );
}

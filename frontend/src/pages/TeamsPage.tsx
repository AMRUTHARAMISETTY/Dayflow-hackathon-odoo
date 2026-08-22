import { useEffect, useState } from "react";
import { Plus, UserRoundPlus } from "lucide-react";
import { addTeamMembers, createTeam, fetchEmployees, fetchTeamMembers, fetchTeams } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Employee, Team, TeamMember } from "../lib/types";

export function TeamsPage() {
  const { can } = useAuth();
  const notify = useToast();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [addEmployeeId, setAddEmployeeId] = useState("");
  const [addRole, setAddRole] = useState("Member");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchTeams({ size: 50 }).then((res) => setTeams(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load teams."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => { fetchEmployees({ status: "Active", size: 100 }).then((res) => setEmployees(res.data.items)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!selected) return;
    fetchTeamMembers(selected.id).then(setMembers).catch(() => setMembers([]));
  }, [selected]);

  if (loading && !teams) return <LoadingSkeleton rows={6} />;
  if (error && !teams) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="toolbar">
        <div className="spacer" />
        {can("team:write") && <button className="primary" onClick={() => setShowCreate(true)}><Plus size={16} />Create team</button>}
      </div>

      {teams && teams.length === 0 && <EmptyState title="No teams yet" description="Create delivery, department, or cross-functional teams to organize work." />}
      {teams && teams.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Team</th><th>Lead</th><th>Members</th><th>Open tasks</th><th>Capacity</th><th></th></tr></thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id}>
                  <td data-label="Team"><strong>{team.name}</strong><br /><span className="muted">{team.code} · {team.type}</span></td>
                  <td data-label="Lead">{team.leadName ?? team.ownerName ?? "Unassigned"}</td>
                  <td data-label="Members">{team.memberCount}</td>
                  <td data-label="Open tasks">{team.activeTaskCount}</td>
                  <td data-label="Capacity">{team.capacityHoursPerWeek}h/week</td>
                  <td data-label=""><button className="secondary" onClick={() => setSelected(team)}>Members</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>{selected.name} members</h3>
          {can("team:write") && (
            <div className="toolbar">
              <select value={addEmployeeId} onChange={(event) => setAddEmployeeId(event.target.value)} aria-label="Employee">
                <option value="">Select employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
              <select value={addRole} onChange={(event) => setAddRole(event.target.value)} aria-label="Team role">
                <option>Member</option><option>Lead</option><option>Owner</option><option>Reviewer</option>
              </select>
              <button className="primary" disabled={!addEmployeeId} onClick={async () => {
                try {
                  const next = await addTeamMembers(selected.id, [{ employeeId: Number(addEmployeeId), teamRole: addRole, allocationPercent: 100 }]);
                  setMembers(next);
                  setAddEmployeeId("");
                  notify("success", "Member added.");
                  load();
                } catch (err) {
                  notify("error", err instanceof Error ? err.message : "Could not add member.");
                }
              }}><UserRoundPlus size={16} />Add</button>
            </div>
          )}
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>Allocation</th><th>Department</th></tr></thead>
              <tbody>{members.map((member) => (
                <tr key={member.id}><td data-label="Name">{member.employeeName}</td><td data-label="Role">{member.teamRole}</td><td data-label="Allocation">{member.allocationPercent}%</td><td data-label="Department">{member.departmentName ?? "-"}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <CreateTeamModal employees={employees} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); notify("success", "Team created."); load(); }} />}
    </>
  );
}

function CreateTeamModal({ employees, onClose, onCreated }: { employees: Employee[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("Cross-functional");
  const [leadEmployeeId, setLeadEmployeeId] = useState("");
  const [objective, setObjective] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Create team</h2>
        <label className="field">Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field">Code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
        <label className="field">Type<select value={type} onChange={(event) => setType(event.target.value)}><option>Cross-functional</option><option>Department</option><option>Project</option></select></label>
        <label className="field">Lead<select value={leadEmployeeId} onChange={(event) => setLeadEmployeeId(event.target.value)}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="field">Objective<textarea value={objective} onChange={(event) => setObjective(event.target.value)} /></label>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary" disabled={saving || !name || !code || !type} onClick={async () => {
            setSaving(true);
            try {
              await createTeam({ name, code, type, objective, leadEmployeeId: leadEmployeeId ? Number(leadEmployeeId) : undefined, capacityHoursPerWeek: 40 });
              onCreated();
            } finally {
              setSaving(false);
            }
          }}>{saving ? "Creating..." : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

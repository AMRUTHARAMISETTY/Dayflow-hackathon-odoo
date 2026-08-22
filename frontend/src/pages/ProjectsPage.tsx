import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createProject, fetchEmployees, fetchProjects, fetchTeams } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Employee, Project, Team } from "../lib/types";

export function ProjectsPage() {
  const { can } = useAuth();
  const notify = useToast();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchProjects({ size: 50 }).then((res) => setProjects(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load projects."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    fetchEmployees({ status: "Active", size: 100 }).then((res) => setEmployees(res.data.items)).catch(() => undefined);
    fetchTeams({ size: 100 }).then((res) => setTeams(res.items)).catch(() => undefined);
  }, []);

  if (loading && !projects) return <LoadingSkeleton rows={6} />;
  if (error && !projects) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="toolbar"><div className="spacer" />{can("project:write") && <button className="primary" onClick={() => setShowCreate(true)}><Plus size={16} />Create project</button>}</div>
      {projects && projects.length === 0 && <EmptyState title="No projects yet" description="Create a project to connect teams, milestones, and work queues." />}
      {projects && projects.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Project</th><th>Status</th><th>Owner</th><th>Teams</th><th>Open tasks</th><th>Progress</th></tr></thead>
            <tbody>{projects.map((project) => (
              <tr key={project.id}>
                <td data-label="Project"><strong>{project.name}</strong><br /><span className="muted">{project.code}</span></td>
                <td data-label="Status"><span className={`status-pill ${project.status.toLowerCase().replaceAll(" ", "-")}`}>{project.status}</span></td>
                <td data-label="Owner">{project.ownerName}</td>
                <td data-label="Teams">{project.teamCount}</td>
                <td data-label="Open tasks">{project.openTaskCount}</td>
                <td data-label="Progress">{project.completionPercent}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {showCreate && <CreateProjectModal employees={employees} teams={teams} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); notify("success", "Project created."); load(); }} />}
    </>
  );
}

function CreateProjectModal({ employees, teams, onClose, onCreated }: { employees: Employee[]; teams: Team[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [owner, setOwner] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Create project</h2>
        <label className="field">Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field">Code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
        <label className="field">Owner<select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">Select owner</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="field">Sponsor<select value={sponsor} onChange={(event) => setSponsor(event.target.value)}><option value="">Select sponsor</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="field">Team<select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">No team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary" disabled={saving || !name || !code || !owner || !sponsor} onClick={async () => {
            setSaving(true);
            try {
              await createProject({ name, code, ownerEmployeeId: Number(owner), sponsorEmployeeId: Number(sponsor), teamIds: teamId ? [Number(teamId)] : undefined, status: "Planning", priority: "Medium" });
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

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createTask, fetchEmployees, fetchProjects, fetchTasks, fetchTeams, updateTaskStatus } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Employee, Project, TaskItem, Team } from "../lib/types";

const statuses = ["To Do", "In Progress", "Blocked", "Completed"];

export function TasksPage() {
  const { can } = useAuth();
  const notify = useToast();
  const [tasks, setTasks] = useState<TaskItem[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchTasks({ status: status || undefined, size: 50 }).then((res) => setTasks(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load tasks."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);
  useEffect(() => {
    fetchProjects({ size: 100 }).then((res) => setProjects(res.items)).catch(() => undefined);
    fetchTeams({ size: 100 }).then((res) => setTeams(res.items)).catch(() => undefined);
    fetchEmployees({ status: "Active", size: 100 }).then((res) => setEmployees(res.data.items)).catch(() => undefined);
  }, []);

  if (loading && !tasks) return <LoadingSkeleton rows={6} />;
  if (error && !tasks) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="spacer" />
        {can("task:write") && <button className="primary" onClick={() => setShowCreate(true)}><Plus size={16} />Create task</button>}
      </div>
      {tasks && tasks.length === 0 && <EmptyState title="No tasks found" description="Create tasks from project work, reviews, payroll checks, or HR automation follow-ups." />}
      {tasks && tasks.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Task</th><th>Project</th><th>Team</th><th>Status</th><th>Priority</th><th>Estimate</th><th></th></tr></thead>
            <tbody>{tasks.map((task) => (
              <tr key={task.id}>
                <td data-label="Task"><strong>{task.title}</strong><br /><span className="muted">{task.automationHint ?? task.type}</span></td>
                <td data-label="Project">{task.projectName}</td>
                <td data-label="Team">{task.teamName ?? "-"}</td>
                <td data-label="Status"><span className={`status-pill ${task.status.toLowerCase().replaceAll(" ", "-")}`}>{task.status}</span></td>
                <td data-label="Priority">{task.priority}</td>
                <td data-label="Estimate">{task.estimatedHours}h</td>
                <td data-label="">
                  {can("task:write") && (
                    <select value={task.status} aria-label="Update status" onChange={async (event) => {
                      try {
                        await updateTaskStatus(task.id, event.target.value);
                        notify("success", "Task updated.");
                        load();
                      } catch (err) {
                        notify("error", err instanceof Error ? err.message : "Could not update task.");
                      }
                    }}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {showCreate && <CreateTaskModal projects={projects} teams={teams} employees={employees} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); notify("success", "Task created."); load(); }} />}
    </>
  );
}

function CreateTaskModal({ projects, teams, employees, onClose, onCreated }: { projects: Project[]; teams: Team[]; employees: Employee[]; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("8");
  const [saving, setSaving] = useState(false);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Create task</h2>
        <label className="field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field">Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="field">Team<select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">No team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
        <label className="field">Assignee<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">No assignee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="field">Estimate hours<input type="number" min="0" value={estimatedHours} onChange={(event) => setEstimatedHours(event.target.value)} /></label>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary" disabled={saving || !title || !projectId} onClick={async () => {
            setSaving(true);
            try {
              await createTask({
                title,
                projectId: Number(projectId),
                teamId: teamId ? Number(teamId) : undefined,
                estimatedHours: Number(estimatedHours || 0),
                assigneeEmployeeIds: assigneeId ? [Number(assigneeId)] : undefined
              });
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

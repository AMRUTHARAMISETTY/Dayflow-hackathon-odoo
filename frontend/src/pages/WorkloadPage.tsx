import { useEffect, useState } from "react";
import { fetchTeams, fetchWorkload } from "../lib/api";
import { ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Team, WorkloadRow } from "../lib/types";

export function WorkloadPage() {
  const [rows, setRows] = useState<WorkloadRow[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchWorkload({ teamId: teamId ? Number(teamId) : undefined }).then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load workload."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [teamId]);
  useEffect(() => { fetchTeams({ size: 100 }).then((res) => setTeams(res.items)).catch(() => undefined); }, []);

  if (loading && !rows) return <LoadingSkeleton rows={6} />;
  if (error && !rows) return <ErrorState message={error} onRetry={load} />;

  const overloaded = rows?.filter((row) => row.riskLevel === "Overloaded").length ?? 0;
  const atRisk = rows?.filter((row) => row.riskLevel === "At Risk").length ?? 0;

  return (
    <>
      <div className="toolbar">
        <select value={teamId} onChange={(event) => setTeamId(event.target.value)} aria-label="Team">
          <option value="">All teams</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </div>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card"><span>People tracked</span><strong>{rows?.length ?? 0}</strong></div>
        <div className="kpi-card"><span>At risk</span><strong>{atRisk}</strong></div>
        <div className="kpi-card"><span>Overloaded</span><strong>{overloaded}</strong></div>
      </div>
      {rows && (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Team</th><th>Allocation</th><th>Capacity</th><th>Open work</th><th>Leave</th><th>Remaining</th><th>Risk</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={`${row.teamId}-${row.employeeId}`}>
                <td data-label="Employee"><strong>{row.employeeName}</strong><br /><span className="muted">{row.designation ?? row.departmentName ?? "-"}</span></td>
                <td data-label="Team">{row.teamName}</td>
                <td data-label="Allocation">{row.allocationPercent}%</td>
                <td data-label="Capacity">{row.weeklyCapacityHours}h</td>
                <td data-label="Open work">{row.assignedOpenHours}h</td>
                <td data-label="Leave">{row.approvedLeaveDays}d</td>
                <td data-label="Remaining">{row.remainingHours}h</td>
                <td data-label="Risk"><span className={`status-pill ${row.riskLevel.toLowerCase().replaceAll(" ", "-")}`}>{row.riskLevel}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

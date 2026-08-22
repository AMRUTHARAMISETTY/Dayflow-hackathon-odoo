import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOrgChart } from "../lib/api";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Employee } from "../lib/types";

type TreeNode = Employee & { children: TreeNode[] };

export function OrgChartPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchOrgChart().then(setEmployees).catch((err) => setError(err instanceof Error ? err.message : "Could not load the organization chart.")).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const roots = useMemo(() => {
    if (!employees) return [];
    const byId = new Map<number, TreeNode>(employees.map((e) => [e.id, { ...e, children: [] }]));
    const top: TreeNode[] = [];
    byId.forEach((node) => {
      if (node.managerId && byId.has(node.managerId)) byId.get(node.managerId)!.children.push(node);
      else top.push(node);
    });
    return top;
  }, [employees]);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!employees || employees.length === 0) return <EmptyState title="No employees to chart yet" />;

  return (
    <div className="panel">
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {roots.map((node) => <OrgNode key={node.id} node={node} depth={0} onSelect={(id) => navigate(`/employees/${id}`)} />)}
      </ul>
    </div>
  );
}

function OrgNode({ node, depth, onSelect }: { node: TreeNode; depth: number; onSelect: (id: number) => void }) {
  return (
    <li>
      <button
        onClick={() => onSelect(node.id)}
        style={{
          display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", textAlign: "left",
          padding: "8px 6px", marginLeft: depth * 24, borderRadius: 6, width: "calc(100% - " + depth * 24 + "px)"
        }}
        className="nav-item"
      >
        <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{node.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}</span>
        <span>
          <strong>{node.name}</strong>
          <span style={{ color: "var(--text-faint)", marginLeft: 8, fontSize: 12 }}>{node.designation ?? "—"} · {node.departmentName ?? "—"}</span>
        </span>
      </button>
      {node.children.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {node.children.map((child) => <OrgNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />)}
        </ul>
      )}
    </li>
  );
}

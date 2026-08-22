import { useEffect, useState } from "react";
import { fetchRoles } from "../lib/api";
import { ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Role } from "../lib/types";

export function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchRoles().then(setRoles).catch((err) => setError(err instanceof Error ? err.message : "Could not load roles.")).finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingSkeleton rows={7} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!roles) return null;

  const allPermissions = [...new Set(roles.flatMap((r) => r.permissions))].sort();

  return (
    <div className="table-scroll">
      <table className="data-table role-matrix-table">
        <thead>
          <tr>
            <th>Permission</th>
            {roles.map((role) => <th key={role.id}>{role.name.replace(/_/g, " ")}</th>)}
          </tr>
        </thead>
        <tbody>
          {allPermissions.map((permission) => (
            <tr key={permission}>
              <td data-label="Permission"><code>{permission}</code></td>
              {roles.map((role) => (
                <td data-label={role.name} key={role.id} style={{ textAlign: "center" }}>
                  {role.permissions.includes(permission) ? "✓" : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 12 }}>
        Roles and their permissions are fixed in Phase 1. A no-code editor for custom roles ships with the Phase 3 workflow builder.
      </p>
    </div>
  );
}

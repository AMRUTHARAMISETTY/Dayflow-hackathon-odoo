import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { PermissionDenied } from "./components/StateViews";
import { useAuth } from "./lib/auth-context";
import { AcceptInvitationPage } from "./pages/AcceptInvitationPage";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { AutomationRulesPage } from "./pages/AutomationRulesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeeProfilePage } from "./pages/EmployeeProfilePage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { InvitationsPage } from "./pages/InvitationsPage";
import { LeavePage } from "./pages/LeavePage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OrgChartPage } from "./pages/OrgChartPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RolesPage } from "./pages/RolesPage";
import { TasksPage } from "./pages/TasksPage";
import { TeamsPage } from "./pages/TeamsPage";
import { WorkloadPage } from "./pages/WorkloadPage";

function RequirePermission({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { can } = useAuth();
  if (!anyOf.some((permission) => can(permission))) return <PermissionDenied />;
  return <>{children}</>;
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-screen"><div className="brand-mark">D</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/accept-invitation" element={<PublicOnly><AcceptInvitationPage /></PublicOnly>} />

      <Route path="/" element={<Protected><AppShell /></Protected>}>
        <Route index element={<RequirePermission anyOf={["dashboard:read"]}><DashboardPage /></RequirePermission>} />
        <Route path="employees" element={<RequirePermission anyOf={["employee:read", "employee:read:reports", "employee:read:own"]}><EmployeesPage /></RequirePermission>} />
        <Route path="employees/:id" element={<RequirePermission anyOf={["employee:read", "employee:read:reports", "employee:read:own"]}><EmployeeProfilePage /></RequirePermission>} />
        <Route path="org-chart" element={<RequirePermission anyOf={["orgchart:read"]}><OrgChartPage /></RequirePermission>} />
        <Route path="teams" element={<RequirePermission anyOf={["team:read"]}><TeamsPage /></RequirePermission>} />
        <Route path="attendance" element={<RequirePermission anyOf={["attendance:checkin", "attendance:read", "attendance:read:reports", "attendance:read:own"]}><AttendancePage /></RequirePermission>} />
        <Route path="attendance/corrections" element={<Navigate to="/attendance?tab=corrections" replace />} />
        <Route path="leave" element={<RequirePermission anyOf={["leave:read:own", "leave:read", "leave:read:reports", "leave:request"]}><LeavePage /></RequirePermission>} />
        <Route path="leave/approvals" element={<Navigate to="/leave?tab=approvals" replace />} />
        <Route path="projects" element={<RequirePermission anyOf={["project:read"]}><ProjectsPage /></RequirePermission>} />
        <Route path="tasks" element={<RequirePermission anyOf={["task:read"]}><TasksPage /></RequirePermission>} />
        <Route path="workload" element={<RequirePermission anyOf={["workload:read"]}><WorkloadPage /></RequirePermission>} />
        <Route path="approvals" element={<RequirePermission anyOf={["leave:approve", "attendance:approve_correction", "employee:write"]}><ApprovalsPage /></RequirePermission>} />
        <Route path="automation" element={<RequirePermission anyOf={["automation:read"]}><AutomationRulesPage /></RequirePermission>} />
        <Route path="notifications" element={<RequirePermission anyOf={["notification:read"]}><NotificationsPage /></RequirePermission>} />
        <Route path="audit-logs" element={<RequirePermission anyOf={["audit:read"]}><AuditLogPage /></RequirePermission>} />
        <Route path="roles" element={<RequirePermission anyOf={["role:read"]}><RolesPage /></RequirePermission>} />
        <Route path="invitations" element={<RequirePermission anyOf={["invitation:read"]}><InvitationsPage /></RequirePermission>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

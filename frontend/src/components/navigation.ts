import {
  Bell, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ClipboardList, FileText, Gauge, KeyRound,
  LayoutDashboard, LifeBuoy, Mail, Megaphone, Network, ScrollText, Settings, ShieldCheck, TrendingUp, UserPlus,
  Users, Wallet, Workflow, type LucideIcon
} from "lucide-react";

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
  built: boolean;
  phaseNote?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", path: "/", icon: LayoutDashboard, permission: "dashboard:read", built: true },
      { label: "My Tasks", path: "/tasks", icon: CheckCircle2, permission: "task:read", built: true },
      { label: "Calendar", path: "/calendar", icon: CalendarDays, built: false, phaseNote: "Phase 3" },
      { label: "Notifications", path: "/notifications", icon: Bell, permission: "notification:read", built: true }
    ]
  },
  {
    label: "People",
    items: [
      { label: "Employees", path: "/employees", icon: Users, built: true },
      { label: "Organization Chart", path: "/org-chart", icon: Network, permission: "orgchart:read", built: true },
      { label: "Teams", path: "/teams", icon: Building2, permission: "team:read", built: true },
      { label: "Onboarding", path: "/onboarding", icon: UserPlus, built: false, phaseNote: "Phase 3" },
      { label: "Documents", path: "/documents", icon: FileText, built: false, phaseNote: "Phase 4" }
    ]
  },
  {
    label: "Work Management",
    items: [
      { label: "Attendance", path: "/attendance", icon: Gauge, permission: "attendance:checkin", built: true },
      { label: "Leave", path: "/leave", icon: ClipboardList, permission: "leave:read:own", built: true },
      { label: "Projects", path: "/projects", icon: BriefcaseBusiness, permission: "project:read", built: true },
      { label: "Tasks", path: "/tasks", icon: CheckCircle2, permission: "task:read", built: true },
      { label: "Workload", path: "/workload", icon: TrendingUp, permission: "workload:read", built: true },
      { label: "Shifts", path: "/shifts", icon: CalendarDays, built: false, phaseNote: "Admin UI pending" },
      { label: "Approvals", path: "/approvals", icon: CheckCircle2, permission: "leave:approve", built: true }
    ]
  },
  {
    label: "Finance",
    items: [
      { label: "Payroll", path: "/payroll", icon: Wallet, built: false, phaseNote: "Phase 4" },
      { label: "Payroll Exceptions", path: "/payroll/exceptions", icon: ShieldCheck, built: false, phaseNote: "Phase 4" }
    ]
  },
  {
    label: "Employee Experience",
    items: [
      { label: "HR Help Desk", path: "/tickets", icon: LifeBuoy, built: false, phaseNote: "Phase 5" },
      { label: "Announcements", path: "/announcements", icon: Megaphone, built: false, phaseNote: "Phase 5" },
      { label: "Performance", path: "/performance", icon: TrendingUp, built: false, phaseNote: "Phase 6" }
    ]
  },
  {
    label: "Insights",
    items: [
      { label: "Audit Logs", path: "/audit-logs", icon: ScrollText, permission: "audit:read", built: true },
      { label: "Reports", path: "/reports", icon: BriefcaseBusiness, built: false, phaseNote: "Phase 7" }
    ]
  },
  {
    label: "Administration",
    items: [
      { label: "Departments", path: "/departments", icon: Building2, built: false, phaseNote: "Managed via employee forms" },
      { label: "Roles", path: "/roles", icon: KeyRound, permission: "role:read", built: true },
      { label: "Invitations", path: "/invitations", icon: Mail, permission: "invitation:read", built: true },
      { label: "Workflow Builder", path: "/automation", icon: Workflow, permission: "automation:read", built: true },
      { label: "Settings", path: "/settings", icon: Settings, built: false, phaseNote: "Phase 7" }
    ]
  }
];

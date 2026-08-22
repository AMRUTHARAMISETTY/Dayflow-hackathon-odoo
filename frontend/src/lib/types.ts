export type UserView = {
  id: number;
  employeeId: number;
  employeeCode: string | null;
  name: string;
  email: string;
  role: string;
  departmentName: string | null;
  designation: string | null;
  permissions: string[];
};

export type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserView;
};

export type Employee = {
  id: number;
  employeeCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  departmentId: number | null;
  departmentName: string | null;
  designation: string | null;
  managerId: number | null;
  managerName: string | null;
  location: string | null;
  employmentType: string | null;
  status: string;
  joiningDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  hasLoginAccount: boolean;
};

export type EmployeeJobHistoryEntry = {
  id: number;
  departmentId: number | null;
  departmentName: string | null;
  designation: string | null;
  managerId: number | null;
  managerName: string | null;
  employmentType: string | null;
  status: string;
  effectiveDate: string;
  changeType: string;
  reason: string | null;
  changedByName: string;
  createdAt: string;
};

export type PageResponse<T> = { items: T[]; page: number; size: number; total: number };

export type AuditLogEntry = {
  id: number;
  actorUserId: number | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  requestId: string;
  ipAddress: string | null;
  createdAt: string;
};

export type Role = { id: number; name: string; description: string; permissions: string[] };
export type Department = { id: number; name: string; location: string };

export type InvitationView = {
  id: number;
  email: string;
  roleName: string;
  employeeId: number | null;
  employeeName: string | null;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invitedByName: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type CreatedInvitation = { invitation: InvitationView; token: string; acceptPath: string };
export type AcceptInvitationLookup = { email: string; roleName: string; expired: boolean };

export type KpiCard = { key: string; label: string; value: number | null; available: boolean; note: string | null; href: string | null };
export type DepartmentCount = { department: string; activeCount: number };
export type RecentActivityItem = { actor: string; action: string; entity: string; createdAt: string };
export type AttentionItem = {
  severity: string; title: string; detail: string; actionLabel: string; href: string;
  entityType: "Employee" | "LeaveRequest" | "AttendanceCorrection" | null; entityId: number | null;
};

export type UpcomingLeaveItem = { employeeName: string; leaveTypeName: string; startDate: string; endDate: string };

export type DashboardSummary = {
  greeting: string;
  currentDate: string;
  lastSynchronizedAt: string;
  kpis: KpiCard[];
  departmentBreakdown: DepartmentCount[];
  canViewActivity: boolean;
  recentActivity: RecentActivityItem[];
  needsAttention: AttentionItem[];
  canViewAvailability: boolean;
  upcomingLeave: UpcomingLeaveItem[];
};

// ---- Phase 2: attendance, leave, notifications ----

export type Shift = { id: number; name: string; startTime: string; endTime: string; graceMinutes: number; breakMinutes: number };

export type AttendanceDayView = {
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "Present" | "On Leave" | "Holiday" | "Weekend" | "Absent" | "Not Checked In" | "Upcoming";
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  missingCheckout: boolean;
};

export type AttendanceSummary = {
  employeeId: number;
  from: string;
  to: string;
  presentDays: number;
  absentDays: number;
  onLeaveDays: number;
  lateDays: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
};

export type AttendanceCorrection = {
  id: number;
  employeeId: number;
  employeeName: string;
  workDate: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  evidenceNote: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedByName: string | null;
  decisionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type LeaveType = {
  id: number;
  name: string;
  description: string;
  requiresApproval: boolean;
  maxConsecutiveDays: number | null;
  paid: boolean;
  active: boolean;
};

export type LeaveBalance = { employeeId: number; leaveTypeId: number; leaveTypeName: string; balance: string };

export type LeaveRequest = {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  approverName: string | null;
  decisionReason: string | null;
  autoApproved: boolean;
  createdAt: string;
  decidedAt: string | null;
  cancelledAt: string | null;
};

export type AppNotification = {
  id: number;
  category: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

// ---- Phase 3: Automation Engine ----

export type AutomationRule = {
  id: number;
  code: string;
  name: string;
  description: string;
  triggerType: string;
  config: string;
  active: boolean;
  testMode: boolean;
  highRisk: boolean;
  ownerName: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  runCount: number;
  successCount: number;
  successRatePercent: number;
  createdAt: string;
  updatedAt: string;
};

export type AutomationExecution = {
  id: number;
  ruleId: number;
  startedAt: string;
  finishedAt: string | null;
  status: "SUCCESS" | "FAILURE" | "DRY_RUN";
  matchedCount: number;
  actionCount: number;
  detail: string | null;
  errorMessage: string | null;
};

// ---- Team Management (spec §41): teams, projects, tasks, workload ----

export type Team = {
  id: number;
  name: string;
  code: string;
  type: string;
  description: string | null;
  objective: string | null;
  departmentId: number | null;
  departmentName: string | null;
  location: string | null;
  costCenter: string | null;
  ownerEmployeeId: number | null;
  ownerName: string | null;
  leadEmployeeId: number | null;
  leadName: string | null;
  deputyLeadEmployeeId: number | null;
  deputyLeadName: string | null;
  startDate: string | null;
  endDate: string | null;
  workingDays: string;
  timeZone: string;
  defaultShiftId: number | null;
  visibility: string;
  capacityHoursPerWeek: string;
  notificationSettings: string | null;
  active: boolean;
  memberCount: number;
  activeTaskCount: number;
  createdAt: string;
};

export type TeamMember = {
  id: number;
  teamId: number;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  designation: string | null;
  teamRole: string;
  allocationPercent: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  temporaryCoverEmployeeId: number | null;
  temporaryCoverName: string | null;
  delegationNote: string | null;
  active: boolean;
  createdAt: string;
};

export type Project = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  businessOutcome: string | null;
  status: string;
  priority: string;
  sponsorEmployeeId: number;
  sponsorName: string;
  ownerEmployeeId: number;
  ownerName: string;
  startDate: string | null;
  targetDate: string | null;
  budgetAmount: string | null;
  completionPercent: string;
  teamCount: number;
  taskCount: number;
  openTaskCount: number;
  createdAt: string;
};

export type ProjectMilestone = {
  id: number;
  projectId: number;
  name: string;
  status: string;
  dueDate: string | null;
  completionPercent: string;
  createdAt: string;
};

export type TaskItem = {
  id: number;
  projectId: number;
  projectName: string;
  teamId: number | null;
  teamName: string | null;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  reporterEmployeeId: number | null;
  reporterName: string | null;
  reviewerEmployeeId: number | null;
  reviewerName: string | null;
  dueDate: string | null;
  estimatedHours: string;
  actualHours: string;
  automationHint: string | null;
  assigneeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskAssignee = {
  id: number;
  taskId: number;
  employeeId: number;
  employeeName: string;
  role: string;
  allocationPercent: string;
  assignedAt: string;
};

export type WorkloadRow = {
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  designation: string | null;
  teamId: number;
  teamName: string;
  allocationPercent: string;
  weeklyCapacityHours: string;
  assignedOpenHours: string;
  approvedLeaveDays: string;
  remainingHours: string;
  riskLevel: string;
};

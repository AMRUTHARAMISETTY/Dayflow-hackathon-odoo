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

export type AuthMessage = { message: string };
export type PasskeyOptionsResponse = { challenge: string; publicKey: Record<string, unknown> };
export type PasskeyView = {
  credentialId: string;
  deviceName: string;
  transports: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};
export type AuthSession = {
  id: number;
  createdIp: string | null;
  userAgent: string | null;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  current: boolean;
};
export type SecurityEvent = {
  id: number;
  eventType: string;
  severity: string;
  detail: string;
  ipAddress: string | null;
  createdAt: string;
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
  bankVerified: boolean;
  taxIdVerified: boolean;
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
  entityType: "Employee" | "LeaveRequest" | "AttendanceCorrection" | "PayrollRun" | null; entityId: number | null;
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

// ---- Phase 4: Payroll ----

export type SalaryStructure = {
  id: number;
  employeeId: number;
  employeeName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  basicMonthly: string;
  hraMonthly: string;
  allowancesMonthly: string;
  recurringDeductionsMonthly: string;
  grossMonthly: string;
  status: "ACTIVE" | "SUPERSEDED";
  reason: string | null;
  createdByName: string;
  createdAt: string;
};

export type PayrollRunStatus = "DRAFT" | "CALCULATED" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "PAID";

export type PayrollRun = {
  id: number;
  periodMonth: string;
  status: PayrollRunStatus;
  calculatedByName: string | null;
  calculatedAt: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  approvalReason: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  paidAt: string | null;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  employeeCount: number;
  createdByName: string;
  createdAt: string;
};

export type PayrollLine = {
  id: number;
  payrollRunId: number;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  basic: string;
  hra: string;
  allowances: string;
  overtimePay: string;
  grossEarnings: string;
  unpaidLeaveDays: string;
  unpaidLeaveDeduction: string;
  taxDeduction: string;
  otherDeductions: string;
  totalDeductions: string;
  netPay: string;
};

export type PayrollAnomaly = {
  id: number;
  payrollRunId: number;
  employeeId: number | null;
  employeeName: string | null;
  issueCode: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  possibleCause: string;
  recommendedAction: string;
  blocking: boolean;
  reviewStatus: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  resolutionNote: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
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

// ---- Phase 5: Communication (email, HR help desk, policies, assistant) ----

export type EmailTemplate = {
  id: number;
  code: string;
  category: string;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipientSelector = { employeeIds: number[]; departmentId: number | null; allActive: boolean };

export type RecipientPreview = {
  recipientCount: number;
  sampleNames: string[];
  senderIdentity: string;
  sampleRenderedSubject: string;
  sampleRenderedBody: string;
  requiresBulkConfirmation: boolean;
};

export type EmailMessage = {
  id: number;
  senderName: string;
  templateId: number | null;
  subject: string;
  body: string;
  recipientEmployeeIds: number[];
  recipientCount: number;
  status: "QUEUED" | "SCHEDULED" | "SENT" | "FAILED";
  scheduledAt: string | null;
  sentAt: string | null;
  bulkConfirmed: boolean;
  failureReason: string | null;
  createdAt: string;
};

export type EmailDelivery = {
  id: number;
  emailMessageId: number;
  employeeId: number;
  employeeName: string;
  emailAddress: string;
  status: "PENDING" | "SENT" | "FAILED";
  sentAt: string | null;
  errorMessage: string | null;
};

export type TicketStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type HrTicket = {
  id: number;
  employeeId: number;
  employeeName: string;
  category: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  confidential: boolean;
  assignedToName: string | null;
  assignedToUserId: number | null;
  slaDueAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  satisfactionRating: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AssignableStaff = { userId: number; name: string; roleName: string; canHandleConfidential: boolean };

export type HrTicketMessage = {
  id: number;
  ticketId: number;
  authorName: string;
  body: string;
  internalNote: boolean;
  createdAt: string;
};

export type Policy = {
  id: number;
  code: string;
  title: string;
  category: string;
  body: string;
  effectiveDate: string;
  active: boolean;
  createdAt: string;
};

// ---- Phase 6: Performance & workforce insights ----

export type Goal = {
  id: number;
  employeeId: number;
  employeeName: string;
  title: string;
  description: string | null;
  category: string;
  dueDate: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED";
  progressPercent: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type PerformanceReview = {
  id: number;
  employeeId: number;
  employeeName: string;
  reviewerUserId: number;
  reviewerName: string;
  cycle: string;
  rating: number | null;
  strengths: string | null;
  improvements: string | null;
  managerComments: string | null;
  status: "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED";
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HeadcountPoint = { period: string; headcount: number; projected: boolean };

export type AttritionRiskEntry = {
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  signals: string[];
};

export type AssistantInteraction = {
  id: number;
  employeeId: number;
  question: string;
  intent: string;
  answer: string;
  policyId: number | null;
  actionTaken: string | null;
  createdAt: string;
};

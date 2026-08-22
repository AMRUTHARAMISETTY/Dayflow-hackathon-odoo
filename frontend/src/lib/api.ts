import { storage, cache } from "./storage";
import type {
  AcceptInvitationLookup, AppNotification, AttendanceCorrection, AttendanceDayView, AttendanceSummary,
  AuditLogEntry, AutomationExecution, AutomationRule, CreatedInvitation, Department, DashboardSummary, Employee,
  EmployeeJobHistoryEntry, InvitationView, LeaveBalance, LeaveRequest, LeaveType, PageResponse, Project,
  ProjectMilestone, Role, Shift, TaskAssignee, TaskItem, Team, TeamMember, TokenPairResponse, UserView, WorkloadRow
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const ACCESS_TOKEN_KEY = "dayflow.accessToken";
const REFRESH_TOKEN_KEY = "dayflow.refreshToken";
const USER_KEY = "dayflow.user";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Thrown when the network request itself fails (no connectivity), distinct from a server error. */
export class OfflineError extends Error {
  constructor() {
    super("You appear to be offline. Showing the last data that loaded successfully.");
  }
}

type ApiEnvelope<T> = { ok: boolean; data: T; error?: string };

export function getAccessToken() {
  return storage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return storage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): UserView | null {
  const raw = storage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as UserView) : null;
}

function persistSession(pair: TokenPairResponse) {
  storage.setItem(ACCESS_TOKEN_KEY, pair.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, pair.refreshToken);
  storage.setItem(USER_KEY, JSON.stringify(pair.user));
}

export function clearSession() {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
}

async function rawFetch(path: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new OfflineError();
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await rawFetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
        if (!response.ok) return false;
        const payload = (await response.json()) as ApiEnvelope<TokenPairResponse>;
        if (!payload.ok) return false;
        persistSession(payload.data);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function api<T>(path: string, options: RequestInit = {}, retrying = false): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await rawFetch(path, { ...options, headers });

  if (response.status === 401 && !retrying && getRefreshToken()) {
    const refreshed = await attemptRefresh();
    if (refreshed) return api<T>(path, options, true);
    clearSession();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("Dayflow could not read the server response.", response.status);
  }
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error ?? "Request failed.", response.status);
  }
  return payload.data;
}

/** Serves the last cached response while offline, per spec section 20 ("keep last successfully
 * loaded dashboard visible during outages"). Returns whether the data shown is stale. */
export async function cachedApi<T>(cacheKey: string, path: string, options: RequestInit = {}): Promise<{ data: T; stale: boolean; asOf: string | null }> {
  try {
    const data = await api<T>(path, options);
    const asOf = new Date().toISOString();
    cache.setItem(cacheKey, JSON.stringify({ data, asOf }));
    return { data, stale: false, asOf };
  } catch (error) {
    if (error instanceof OfflineError) {
      const raw = cache.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: T; asOf: string };
        return { data: parsed.data, stale: true, asOf: parsed.asOf };
      }
    }
    throw error;
  }
}

// ---- Auth ----

export async function login(email: string, password: string) {
  const pair = await api<TokenPairResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  persistSession(pair);
  return pair.user;
}

export async function register(name: string, email: string, password: string) {
  const pair = await api<TokenPairResponse>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  persistSession(pair);
  return pair.user;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  clearSession();
  if (refreshToken) {
    try {
      await rawFetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
    } catch {
      // Best-effort: the local session is already cleared.
    }
  }
}

export function me() {
  return api<UserView>("/api/auth/me");
}

// ---- Dashboard ----

export function fetchDashboard() {
  return cachedApi<DashboardSummary>("dayflow.cache.dashboard", "/api/dashboard/summary");
}

// ---- Departments & roles ----

export function fetchDepartments() {
  return api<Department[]>("/api/departments");
}

export function fetchRoles() {
  return api<Role[]>("/api/roles");
}

// ---- Employees ----

export type EmployeeSearchParams = {
  q?: string;
  departmentId?: number;
  status?: string;
  employmentType?: string;
  location?: string;
  managerId?: number;
  sort?: string;
  direction?: string;
  page?: number;
  size?: number;
};

function toQueryString(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function fetchEmployees(params: EmployeeSearchParams) {
  const cacheKey = `dayflow.cache.employees.${JSON.stringify(params)}`;
  return cachedApi<PageResponse<Employee>>(cacheKey, `/api/employees${toQueryString(params)}`);
}

export function fetchEmployee(id: number) {
  return api<Employee>(`/api/employees/${id}`);
}

export function fetchEmployeeHistory(id: number) {
  return api<EmployeeJobHistoryEntry[]>(`/api/employees/${id}/history`);
}

export function fetchOrgChart() {
  return api<Employee[]>("/api/employees/org-chart");
}

export type CreateEmployeePayload = {
  name: string; email: string; phone?: string; departmentId?: number; designation?: string;
  managerId?: number; location?: string; employmentType?: string; joiningDate?: string;
};

export function createEmployee(payload: CreateEmployeePayload) {
  return api<Employee>("/api/employees", { method: "POST", body: JSON.stringify(payload) });
}

export function updateEmployeeBasic(id: number, phone: string) {
  return api<Employee>(`/api/employees/${id}`, { method: "PATCH", body: JSON.stringify({ phone }) });
}

export type SensitiveUpdatePayload = {
  departmentId?: number; designation?: string; managerId?: number; location?: string;
  employmentType?: string; effectiveDate?: string; reason: string;
};

export function updateEmployeeJobDetails(id: number, payload: SensitiveUpdatePayload) {
  return api<Employee>(`/api/employees/${id}/job-details`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function suspendEmployee(id: number, reason: string, effectiveDate?: string) {
  return api<Employee>(`/api/employees/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason, effectiveDate }) });
}

export function reactivateEmployee(id: number, reason: string, effectiveDate?: string) {
  return api<Employee>(`/api/employees/${id}/reactivate`, { method: "POST", body: JSON.stringify({ reason, effectiveDate }) });
}

export function archiveEmployee(id: number, reason: string, effectiveDate?: string) {
  return api<Employee>(`/api/employees/${id}/archive`, { method: "POST", body: JSON.stringify({ reason, effectiveDate }) });
}

// ---- Audit ----

export type AuditSearchParams = { entity?: string; action?: string; actorUserId?: number; page?: number; size?: number };

export function fetchAuditLogs(params: AuditSearchParams) {
  return api<PageResponse<AuditLogEntry>>(`/api/audit-logs${toQueryString(params)}`);
}

// ---- Invitations ----

export function fetchInvitations(status?: string, page = 0, size = 20) {
  return api<PageResponse<InvitationView>>(`/api/invitations${toQueryString({ status, page, size })}`);
}

export function createInvitation(email: string, roleName: string, employeeId?: number) {
  return api<CreatedInvitation>("/api/invitations", { method: "POST", body: JSON.stringify({ email, roleName, employeeId }) });
}

export function revokeInvitation(id: number) {
  return api<void>(`/api/invitations/${id}/revoke`, { method: "POST" });
}

export function lookupInvitation(token: string) {
  return api<AcceptInvitationLookup>(`/api/invitations/lookup/${encodeURIComponent(token)}`);
}

export async function acceptInvitation(token: string, name: string, password: string) {
  const pair = await api<TokenPairResponse>("/api/invitations/accept", { method: "POST", body: JSON.stringify({ token, name, password }) });
  persistSession(pair);
  return pair.user;
}

// ---- Shifts ----

export function fetchShifts() {
  return api<Shift[]>("/api/shifts");
}

export function assignShift(employeeId: number, shiftId: number | null) {
  return api<void>(`/api/shifts/${employeeId}/assign`, { method: "PUT", body: JSON.stringify({ shiftId }) });
}

// ---- Attendance ----

export function checkIn() {
  return api<AttendanceDayView>("/api/attendance/check-in", { method: "POST" });
}

export function checkOut() {
  return api<AttendanceDayView>("/api/attendance/check-out", { method: "POST" });
}

export function fetchAttendanceToday(departmentId?: number) {
  return cachedApi<AttendanceDayView[]>(`dayflow.cache.attendance.today.${departmentId ?? ""}`,
    `/api/attendance/today${toQueryString({ departmentId })}`);
}

export function fetchEmployeeAttendance(employeeId: number, from: string, to: string) {
  return api<AttendanceDayView[]>(`/api/attendance/employees/${employeeId}${toQueryString({ from, to })}`);
}

export function fetchAttendanceSummary(employeeId: number, from: string, to: string) {
  return api<AttendanceSummary>(`/api/attendance/employees/${employeeId}/summary${toQueryString({ from, to })}`);
}

export type CorrectionPayload = {
  workDate: string; requestedCheckIn?: string; requestedCheckOut?: string; reason: string; evidenceNote?: string;
};

export function requestCorrection(payload: CorrectionPayload) {
  return api<AttendanceCorrection>("/api/attendance/corrections", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchCorrections(status?: string, employeeId?: number, page = 0, size = 20) {
  return api<PageResponse<AttendanceCorrection>>(`/api/attendance/corrections${toQueryString({ status, employeeId, page, size })}`);
}

export function decideCorrection(id: number, approve: boolean, reason: string) {
  return api<AttendanceCorrection>(`/api/attendance/corrections/${id}/decide`, { method: "POST", body: JSON.stringify({ approve, reason }) });
}

// ---- Leave ----

export function fetchLeaveTypes() {
  return api<LeaveType[]>("/api/leave/types");
}

export function fetchLeaveBalances(employeeId: number) {
  return api<LeaveBalance[]>(`/api/leave/employees/${employeeId}/balances`);
}

export type SubmitLeavePayload = { leaveTypeId: number; startDate: string; endDate: string; reason: string };

export function submitLeaveRequest(payload: SubmitLeavePayload) {
  return api<LeaveRequest>("/api/leave/requests", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchLeaveRequests(status?: string, employeeId?: number, page = 0, size = 20) {
  return api<PageResponse<LeaveRequest>>(`/api/leave/requests${toQueryString({ status, employeeId, page, size })}`);
}

export function decideLeaveRequest(id: number, approve: boolean, reason: string) {
  return api<LeaveRequest>(`/api/leave/requests/${id}/decide`, { method: "POST", body: JSON.stringify({ approve, reason }) });
}

export function cancelLeaveRequest(id: number, reason: string) {
  return api<LeaveRequest>(`/api/leave/requests/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });
}

export function fetchLeaveAvailability(days = 7) {
  return api<LeaveRequest[]>(`/api/leave/availability${toQueryString({ days })}`);
}

// ---- Notifications ----

export function fetchNotifications(unreadOnly = false, limit = 30) {
  return api<AppNotification[]>(`/api/notifications${toQueryString({ unreadOnly, limit })}`);
}

export function fetchUnreadCount() {
  return api<{ count: number }>("/api/notifications/unread-count");
}

export function markNotificationRead(id: number) {
  return api<void>(`/api/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return api<void>("/api/notifications/read-all", { method: "POST" });
}

export function notificationStreamUrl() {
  const token = getAccessToken();
  return `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token ?? "")}`;
}

// ---- Automation rules ----

export function fetchAutomationRules() {
  return api<AutomationRule[]>("/api/automation-rules");
}

export function fetchAutomationHistory(ruleId: number, limit = 20) {
  return api<AutomationExecution[]>(`/api/automation-rules/${ruleId}/executions${toQueryString({ limit })}`);
}

export function setAutomationActive(ruleId: number, active: boolean) {
  return api<AutomationRule>(`/api/automation-rules/${ruleId}/active`, { method: "PUT", body: JSON.stringify({ active }) });
}

export function setAutomationTestMode(ruleId: number, testMode: boolean) {
  return api<AutomationRule>(`/api/automation-rules/${ruleId}/test-mode`, { method: "PUT", body: JSON.stringify({ testMode }) });
}

export function updateAutomationConfig(ruleId: number, config: string) {
  return api<AutomationRule>(`/api/automation-rules/${ruleId}/config`, { method: "PUT", body: JSON.stringify({ config }) });
}

export function runAutomationRule(ruleId: number, dryRun: boolean) {
  return api<AutomationExecution>(`/api/automation-rules/${ruleId}/run${toQueryString({ dryRun })}`, { method: "POST" });
}

// ---- Teams, projects, tasks, workload ----

export type TeamSearchParams = { q?: string; type?: string; departmentId?: number; page?: number; size?: number };
export function fetchTeams(params: TeamSearchParams = {}) {
  return api<PageResponse<Team>>(`/api/teams${toQueryString(params)}`);
}

export type CreateTeamPayload = {
  name: string; code: string; type: string; description?: string; objective?: string; departmentId?: number;
  location?: string; costCenter?: string; ownerEmployeeId?: number; leadEmployeeId?: number; deputyLeadEmployeeId?: number;
  startDate?: string; endDate?: string; workingDays?: string; timeZone?: string; visibility?: string; capacityHoursPerWeek?: number;
};
export function createTeam(payload: CreateTeamPayload) {
  return api<Team>("/api/teams", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchTeamMembers(teamId: number) {
  return api<TeamMember[]>(`/api/teams/${teamId}/members`);
}

export function addTeamMembers(teamId: number, members: Array<{ employeeId: number; teamRole: string; allocationPercent?: number }>) {
  return api<TeamMember[]>(`/api/teams/${teamId}/members`, { method: "POST", body: JSON.stringify({ members }) });
}

export type ProjectSearchParams = { q?: string; status?: string; ownerEmployeeId?: number; page?: number; size?: number };
export function fetchProjects(params: ProjectSearchParams = {}) {
  return api<PageResponse<Project>>(`/api/projects${toQueryString(params)}`);
}

export function fetchProjectMilestones(projectId: number) {
  return api<ProjectMilestone[]>(`/api/projects/${projectId}/milestones`);
}

export type CreateProjectPayload = {
  name: string; code: string; description?: string; businessOutcome?: string; status?: string; priority?: string;
  sponsorEmployeeId: number; ownerEmployeeId: number; startDate?: string; targetDate?: string; budgetAmount?: number; teamIds?: number[];
};
export function createProject(payload: CreateProjectPayload) {
  return api<Project>("/api/projects", { method: "POST", body: JSON.stringify(payload) });
}

export type TaskSearchParams = { projectId?: number; teamId?: number; assigneeEmployeeId?: number; status?: string; page?: number; size?: number };
export function fetchTasks(params: TaskSearchParams = {}) {
  return api<PageResponse<TaskItem>>(`/api/tasks${toQueryString(params)}`);
}

export function fetchTaskAssignees(taskId: number) {
  return api<TaskAssignee[]>(`/api/tasks/${taskId}/assignees`);
}

export type CreateTaskPayload = {
  projectId: number; teamId?: number; title: string; description?: string; type?: string; status?: string; priority?: string;
  reporterEmployeeId?: number; reviewerEmployeeId?: number; dueDate?: string; estimatedHours?: number; automationHint?: string; assigneeEmployeeIds?: number[];
};
export function createTask(payload: CreateTaskPayload) {
  return api<TaskItem>("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
}

export function updateTaskStatus(id: number, status: string, actualHours?: number) {
  return api<TaskItem>(`/api/tasks/${id}/status`, { method: "POST", body: JSON.stringify({ status, actualHours }) });
}

export function assignTask(id: number, employeeId: number, role = "Owner", allocationPercent = 100) {
  return api<TaskAssignee[]>(`/api/tasks/${id}/assignees`, { method: "POST", body: JSON.stringify({ employeeId, role, allocationPercent }) });
}

export function fetchWorkload(params: { teamId?: number; from?: string; to?: string } = {}) {
  return api<WorkloadRow[]>(`/api/workload${toQueryString(params)}`);
}

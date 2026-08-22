export type ApiResponse<T> = { ok: boolean; data: T; error?: string };
export type AppUser = { id: number; name: string; email: string; role: string; permissions: string[] };
export type Kpi = { label: string; value: number; comparison: string; trend: "up" | "down" | "flat"; href: string };
export type Dashboard = {
  greeting: string;
  organization: string;
  currentDate: string;
  lastSynchronizedAt: string;
  kpis: Kpi[];
  attention: { severity: string; title: string; detail: string; action: string }[];
  workforceTrend: { label: string; present: number; absent: number }[];
  recentActivity: string[];
};
export type Employee = {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  position: string;
  location: string;
  status: string;
  joiningDate: string;
  bankVerified: boolean;
};
export type Page<T> = { items: T[]; page: number; size: number; total: number };
export type LeaveRequest = { id: number; employee: string; leaveType: string; startDate: string; endDate: string; workingDays: number; status: string; reason: string; availableBalance: number };
export type PayrollAnomaly = { id: number; employee: string; issue: string; severity: string; possibleCause: string; recommendedAction: string; reviewStatus: string };
export type Ticket = { id: number; employee: string; category: string; subject: string; status: string; priority: string; confidential: boolean; slaDueAt: string };
export type AutomationRule = { id: number; name: string; description: string; triggerName: string; conditionText: string; actionText: string; active: boolean; testMode: boolean; highRisk: boolean; successRate: number };
export type AuditLog = { id: number; actor: string; action: string; entity: string; entityId: string; reason: string; requestId: string; createdAt: string };

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export class ApiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = storage.getItem("dayflow.token");
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.ok) throw new ApiError(payload.error ?? "Request failed", response.status);
  return payload.data;
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new ApiError(payload.error ?? "Login failed", response.status);
  storage.setItem("dayflow.token", payload.data.accessToken);
  return payload.data.user as AppUser;
}
import { storage } from "./storage";

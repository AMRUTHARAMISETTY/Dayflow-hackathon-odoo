export type LeaveType = "Paid" | "Sick" | "Unpaid"
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled"
export type AttendanceStatus =
  | "present"
  | "absent"
  | "half-day"
  | "leave"
  | "holiday"
  | "weekend"
  | "exception"
export type CheckSource = "web" | "mobile" | "kiosk" | "biometric"

export interface Employee {
  id: string
  employeeId: string
  name: string
  email: string
  password: string
  title: string
  department: string
  manager: string
  managerId: string
  avatarUrl: string
}

export interface AttendanceSegment {
  kind: "worked" | "break" | "overtime"
  startMinutes: number
  endMinutes: number
}

export interface AttendanceDay {
  date: string
  status: AttendanceStatus
  shiftStartMinutes: number
  shiftEndMinutes: number
  checkIn?: { time: string; source: CheckSource }
  checkOut?: { time: string; source: CheckSource }
  segments: AttendanceSegment[]
  lateMinutes?: number
  earlyDepartureMinutes?: number
  correctionId?: string
  leaveType?: LeaveType
  holidayName?: string
}

export interface CorrectionRequest {
  id: string
  date: string
  issue: "missing-check-in" | "missing-check-out" | "wrong-time" | "marked-absent" | "other"
  correctedTime?: string
  reason: string
  status: "submitted" | "viewed" | "info-requested" | "approved" | "rejected"
  approverName: string
  submittedAt: string
  comment?: string
}

export type ApproverRole = "manager" | "hr"

export interface ApprovalStep {
  role: ApproverRole
  approverName: string
  status: "waiting" | "active" | "approved" | "rejected" | "skipped"
  actedAt?: string
  comment?: string
  delegatedFrom?: string
  delegationReason?: string
  /** epoch ms; internal to the mock simulator, drives live progression */
  dueAt?: number
}

export interface LeaveBalance {
  type: LeaveType
  entitled: number
  taken: number
  pending: number
  accrualNote: string
  expiryNote?: string
}

export interface LeaveRequest {
  id: string
  type: LeaveType
  startDate: string
  endDate: string
  halfDayStart: boolean
  halfDayEnd: boolean
  workingDays: number
  reason: string
  status: LeaveStatus
  appliedOn: string
  autoApprovedRule?: string
  steps: ApprovalStep[]
}

export interface TeamAwayEntry {
  name: string
  avatarUrl: string
  dates: string[]
}

export interface Teammate {
  name: string
  avatarUrl: string
  awayRanges: { start: string; end: string }[]
}

export interface PayLineItem {
  label: string
  amount: number
  group: "earnings" | "allowances" | "deductions" | "tax"
  linkedDates?: string[]
}

export type PayCycleStatus = "Draft" | "Calculated" | "UnderReview" | "Approved" | "Published"

export interface PaySlip {
  id: string
  month: string
  year: number
  status: PayCycleStatus
  netPay: number
  lineItems: PayLineItem[]
  adjustmentOf?: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  pinned: boolean
  requiresAck: boolean
  acknowledged: boolean
  postedOn: string
}

export type AttentionSource =
  | "document-expiring"
  | "onboarding-task"
  | "policy-ack"
  | "missing-checkout"
  | "correction-info-needed"
  | "leave-info-needed"
  | "training-assignment"
  | "profile-incomplete"
  | "slip-published"

export type AttentionUrgency = "overdue" | "due-today" | "upcoming" | "info"

export interface AttentionItem {
  id: string
  source: AttentionSource
  urgency: AttentionUrgency
  title: string
  detail: string
  dueDate?: string
  actionLabel: string
  actionHref: string
}

export interface DocumentRecord {
  id: string
  name: string
  kind: "uploaded" | "issued"
  status: "pending" | "verified" | "rejected" | "expiring" | "expired" | "available"
  expiresOn?: string
  rejectionReason?: string
  sizeLabel?: string
}

export interface ProfileFieldState<T> {
  value: T
  state: "saved" | "pending" | "rejected"
  rejectionReason?: string
}

export interface Profile {
  personal: {
    address: ProfileFieldState<string>
    phone: ProfileFieldState<string>
    emergencyContact: ProfileFieldState<string>
    personalEmail: ProfileFieldState<string>
  }
  approvalGated: {
    name: ProfileFieldState<string>
    bankAccount: ProfileFieldState<string>
    taxDeclaration: ProfileFieldState<string>
  }
  readOnly: {
    employeeId: string
    department: string
    manager: string
    designation: string
    joiningDate: string
    employmentType: string
  }
  avatarUrl: string
}

export type TicketCategory =
  | "attendance"
  | "leave"
  | "payroll"
  | "benefits"
  | "documents"
  | "policy"
  | "workplace-issue"
  | "confidential-grievance"

export interface Ticket {
  id: string
  category: TicketCategory
  subject: string
  body: string
  status: "open" | "in-progress" | "resolved" | "closed"
  assignedTo?: string
  slaNote: string
  createdAt: string
  attachmentLabel?: string
}

export interface PolicyDoc {
  id: string
  title: string
  category: string
  effectiveDate: string
  version: string
  summary: string
}

export interface DayflowDatabase {
  employees: Employee[]
  profiles: Record<string, Profile>
  attendance: Record<string, AttendanceDay[]>
  corrections: Record<string, CorrectionRequest[]>
  leaveBalances: Record<string, LeaveBalance[]>
  leaveRequests: Record<string, LeaveRequest[]>
  teamAway: Record<string, TeamAwayEntry[]>
  paySlips: Record<string, PaySlip[]>
  announcements: Announcement[]
  documents: Record<string, DocumentRecord[]>
  tickets: Record<string, Ticket[]>
  policies: PolicyDoc[]
}

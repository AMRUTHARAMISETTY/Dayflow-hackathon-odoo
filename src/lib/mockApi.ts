import type {
  AttendanceDay,
  AttentionItem,
  DayflowDatabase,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  PaySlip,
  Ticket,
  TicketCategory,
} from "../types"
import {
  DEMO_EMPLOYEE,
  HR_NAME,
  MANAGER_AWAY,
  MANAGER_NAME,
  TEAM_ROSTER,
  daysFromToday,
  isoDate,
  seedDatabase,
} from "./mockData"
import { isForcedOffline } from "../hooks/useOnlineStatus"

const DB_KEY = "dayflow_db_v3"
const SESSION_KEY = "dayflow_session_v2"

export const HOLIDAYS = new Set<string>([isoDate(daysFromToday(23))])
export const HOLIDAY_NAME = "Founder's Day"

export class OfflineError extends Error {
  constructor() {
    super("Check-in needs a connection. Reconnecting…")
    this.name = "OfflineError"
  }
}
export class ValidationError extends Error {}

function loadDB(): DayflowDatabase {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DayflowDatabase
  } catch {
    // fall through to reseed
  }
  const seeded = seedDatabase()
  localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  return seeded
}

function saveDB(db: DayflowDatabase) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function delay(min = 350, max = 750) {
  const ms = min + Math.random() * (max - min)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assertOnline() {
  if (isForcedOffline() || (typeof navigator !== "undefined" && !navigator.onLine)) {
    throw new OfflineError()
  }
}

// ---------- session ----------

export async function apiSignIn(email: string, password: string) {
  await delay()
  const db = loadDB()
  const user = db.employees.find((e) => e.email.toLowerCase() === email.toLowerCase())
  if (!user) throw new ValidationError("No account found with that email.")
  if (user.password !== password) throw new ValidationError("Incorrect password.")
  localStorage.setItem(SESSION_KEY, user.id)
  return user
}

export function getSessionUserId() {
  return localStorage.getItem(SESSION_KEY)
}

export function apiSignOut() {
  localStorage.removeItem(SESSION_KEY)
}

export async function apiGetCurrentUser() {
  await delay(150, 300)
  const id = getSessionUserId()
  if (!id) return null
  const db = loadDB()
  return db.employees.find((e) => e.id === id) ?? null
}

// ---------- attendance ----------

export async function apiGetAttendance(employeeId: string): Promise<AttendanceDay[]> {
  await delay()
  const db = loadDB()
  return db.attendance[employeeId] ?? []
}

function nowClock() {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

export async function apiCheckIn(employeeId: string): Promise<AttendanceDay> {
  assertOnline()
  await delay(500, 1000)
  const db = loadDB()
  const list = db.attendance[employeeId] ?? []
  const today = isoDate(daysFromToday(0))
  const idx = list.findIndex((d) => d.date === today)
  const time = nowClock()
  const [h, m] = time.split(":").map(Number)
  const minutes = h * 60 + m

  if (idx === -1) {
    const day: AttendanceDay = {
      date: today,
      status: "present",
      shiftStartMinutes: 9 * 60,
      shiftEndMinutes: 18 * 60,
      checkIn: { time, source: "web" },
      segments: [{ kind: "worked", startMinutes: minutes, endMinutes: minutes }],
    }
    list.unshift(day)
  } else {
    list[idx] = {
      ...list[idx],
      checkIn: { time, source: "web" },
      segments: [{ kind: "worked", startMinutes: minutes, endMinutes: minutes }],
    }
  }
  db.attendance[employeeId] = list
  saveDB(db)
  return list.find((d) => d.date === today)!
}

export async function apiCheckOut(employeeId: string): Promise<AttendanceDay> {
  assertOnline()
  await delay(500, 1000)
  const db = loadDB()
  const list = db.attendance[employeeId] ?? []
  const today = isoDate(daysFromToday(0))
  const idx = list.findIndex((d) => d.date === today)
  if (idx === -1) throw new ValidationError("No check-in found for today.")
  const time = nowClock()
  const [h, m] = time.split(":").map(Number)
  const minutes = h * 60 + m
  const day = list[idx]
  const inSeg = day.segments[0]
  list[idx] = {
    ...day,
    checkOut: { time, source: "web" },
    segments: [{ kind: "worked", startMinutes: inSeg?.startMinutes ?? minutes, endMinutes: minutes }],
  }
  db.attendance[employeeId] = list
  saveDB(db)
  return list[idx]
}

export async function apiFixMissingCheckout(employeeId: string, date: string, time: string) {
  await delay()
  const db = loadDB()
  const list = db.attendance[employeeId] ?? []
  const idx = list.findIndex((d) => d.date === date)
  if (idx === -1) throw new ValidationError("Day not found.")
  const [h, m] = time.split(":").map(Number)
  const minutes = h * 60 + m
  const day = list[idx]
  list[idx] = {
    ...day,
    status: "present",
    checkOut: { time, source: "web" },
    segments: [{ kind: "worked", startMinutes: day.segments[0]?.startMinutes ?? minutes, endMinutes: minutes }],
  }
  db.attendance[employeeId] = list
  saveDB(db)
  return list[idx]
}

// ---------- leave ----------

export async function apiGetLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  await delay()
  const db = loadDB()
  return db.leaveBalances[employeeId] ?? []
}

function progressRequests(requests: LeaveRequest[]): { requests: LeaveRequest[]; changed: boolean } {
  const now = Date.now()
  let changed = false

  const next = requests.map((req) => {
    if (req.status !== "pending") return req
    const steps = [...req.steps]
    const activeIdx = steps.findIndex((s) => s.status === "active")
    if (activeIdx === -1) return req
    const active = steps[activeIdx]
    if (!active.dueAt || now < active.dueAt) return req

    changed = true
    steps[activeIdx] = { ...active, status: "approved", actedAt: isoDate(new Date()), dueAt: undefined }

    const nextIdx = activeIdx + 1
    if (nextIdx < steps.length) {
      steps[nextIdx] = { ...steps[nextIdx], status: "active", dueAt: now + 6000 }
      return { ...req, steps }
    }
    return { ...req, steps, status: "approved" as const }
  })

  return { requests: next, changed }
}

export async function apiGetLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  await delay(200, 450)
  const db = loadDB()
  const list = db.leaveRequests[employeeId] ?? []
  const { requests, changed } = progressRequests(list)
  if (changed) {
    db.leaveRequests[employeeId] = requests
    saveDB(db)
  }
  return [...requests].sort((a, b) => (a.appliedOn < b.appliedOn ? 1 : -1))
}

export function previewBalanceImpact(balances: LeaveBalance[], type: LeaveType, workingDays: number) {
  const bal = balances.find((b) => b.type === type)
  const available = bal ? bal.entitled - bal.taken - bal.pending : 0
  const remainingAfter = available - workingDays
  return { available, remainingAfter, sufficient: type === "Unpaid" || remainingAfter >= 0 }
}

export function computeCoverage(startDate: string, endDate: string) {
  const overlaps = TEAM_ROSTER.filter((mate) =>
    mate.awayRanges.some((r) => r.start <= endDate && r.end >= startDate),
  )
  return { count: overlaps.length, total: TEAM_ROSTER.length, teammates: overlaps }
}

export function previewApprovalPath(type: LeaveType, workingDays: number, availableBalance: number) {
  const autoApprove = workingDays <= 1 && availableBalance >= workingDays
  if (autoApprove) {
    return {
      autoApprovedRule: "Leaves of 1 day or less auto-approve when balance is sufficient",
      roles: [] as { role: "manager" | "hr"; approverName: string; delegated: boolean }[],
    }
  }
  const needsHr = type === "Unpaid" || workingDays > 5
  const roles: { role: "manager" | "hr"; approverName: string; delegated: boolean }[] = [
    { role: "manager", approverName: MANAGER_AWAY ? HR_NAME : MANAGER_NAME, delegated: MANAGER_AWAY },
  ]
  if (needsHr) roles.push({ role: "hr", approverName: HR_NAME, delegated: false })
  return { autoApprovedRule: undefined, roles }
}

export interface ApplyLeaveInput {
  type: LeaveType
  startDate: string
  endDate: string
  halfDayStart: boolean
  halfDayEnd: boolean
  workingDays: number
  reason: string
}

export async function apiApplyLeave(employeeId: string, input: ApplyLeaveInput): Promise<LeaveRequest> {
  await delay(400, 800)
  const db = loadDB()
  const balances = db.leaveBalances[employeeId] ?? []
  const impact = previewBalanceImpact(balances, input.type, input.workingDays)
  if (!impact.sufficient) {
    throw new ValidationError(`Not enough ${input.type} leave balance for this request.`)
  }

  const id = `lv-${Date.now().toString(36)}`
  const now = Date.now()
  const autoApprove = input.workingDays <= 1 && impact.available >= input.workingDays

  let request: LeaveRequest
  if (autoApprove) {
    request = {
      id,
      ...input,
      status: "approved",
      appliedOn: isoDate(new Date()),
      autoApprovedRule: "Leaves of 1 day or less auto-approve when balance is sufficient",
      steps: [
        {
          role: "manager",
          approverName: MANAGER_AWAY ? HR_NAME : MANAGER_NAME,
          status: "approved",
          actedAt: isoDate(new Date()),
          ...(MANAGER_AWAY
            ? { delegatedFrom: MANAGER_NAME, delegationReason: "Your manager is on leave" }
            : {}),
        },
      ],
    }
  } else {
    const needsHr = input.type === "Unpaid" || input.workingDays > 5
    const managerStep = {
      role: "manager" as const,
      approverName: MANAGER_AWAY ? HR_NAME : MANAGER_NAME,
      status: "active" as const,
      dueAt: now + 6000,
      ...(MANAGER_AWAY
        ? { delegatedFrom: MANAGER_NAME, delegationReason: "Your manager is on leave" }
        : {}),
    }
    const steps = needsHr
      ? [managerStep, { role: "hr" as const, approverName: HR_NAME, status: "waiting" as const }]
      : [managerStep]

    request = {
      id,
      ...input,
      status: "pending",
      appliedOn: isoDate(new Date()),
      steps,
    }
  }

  balances.forEach((b) => {
    if (b.type === input.type && !autoApprove) b.pending += input.workingDays
    if (b.type === input.type && autoApprove) b.taken += input.workingDays
  })

  db.leaveBalances[employeeId] = balances
  db.leaveRequests[employeeId] = [request, ...(db.leaveRequests[employeeId] ?? [])]
  saveDB(db)
  return request
}

export async function apiCancelLeave(employeeId: string, requestId: string) {
  await delay()
  const db = loadDB()
  const list = db.leaveRequests[employeeId] ?? []
  const idx = list.findIndex((r) => r.id === requestId)
  if (idx === -1) throw new ValidationError("Request not found.")
  const req = list[idx]
  const balances = db.leaveBalances[employeeId] ?? []
  balances.forEach((b) => {
    if (b.type === req.type) {
      if (req.status === "pending") b.pending = Math.max(0, b.pending - req.workingDays)
      if (req.status === "approved") b.taken = Math.max(0, b.taken - req.workingDays)
    }
  })
  list[idx] = { ...req, status: "cancelled" }
  db.leaveRequests[employeeId] = list
  db.leaveBalances[employeeId] = balances
  saveDB(db)
  return list[idx]
}

// ---------- pay ----------

export async function apiGetPaySlips(employeeId: string): Promise<PaySlip[]> {
  await delay()
  const db = loadDB()
  return (db.paySlips[employeeId] ?? []).filter((s) => s.status === "Published")
}

// ---------- profile / documents ----------

export async function apiGetProfile(employeeId: string) {
  await delay()
  const db = loadDB()
  return db.profiles[employeeId]
}

export async function apiUpdatePersonalField(
  employeeId: string,
  field: "address" | "phone" | "emergencyContact" | "personalEmail",
  value: string,
) {
  await delay()
  const db = loadDB()
  const profile = db.profiles[employeeId]
  profile.personal[field] = { value, state: "saved" }
  db.profiles[employeeId] = profile
  saveDB(db)
  return profile
}

export async function apiRequestFieldChange(
  employeeId: string,
  field: "name" | "bankAccount" | "taxDeclaration",
  value: string,
) {
  await delay()
  const db = loadDB()
  const profile = db.profiles[employeeId]
  profile.approvalGated[field] = { value, state: "pending" }
  db.profiles[employeeId] = profile
  saveDB(db)
  return profile
}

export async function apiGetDocuments(employeeId: string) {
  await delay()
  const db = loadDB()
  return db.documents[employeeId] ?? []
}

// ---------- support ----------

export async function apiGetTickets(employeeId: string): Promise<Ticket[]> {
  await delay()
  const db = loadDB()
  return db.tickets[employeeId] ?? []
}

export async function apiCreateTicket(
  employeeId: string,
  input: { category: TicketCategory; subject: string; body: string; attachmentLabel?: string },
): Promise<Ticket> {
  await delay(400, 700)
  const db = loadDB()
  const ticket: Ticket = {
    id: `tk-${Date.now().toString(36)}`,
    ...input,
    status: "open",
    slaNote: input.category === "confidential-grievance" ? "Reviewed within 24 hours" : "Typically resolved in 2 business days",
    createdAt: isoDate(new Date()),
  }
  db.tickets[employeeId] = [ticket, ...(db.tickets[employeeId] ?? [])]
  saveDB(db)
  return ticket
}

export async function apiGetPolicies() {
  await delay()
  const db = loadDB()
  return db.policies
}

export async function apiGetAnnouncements() {
  await delay()
  const db = loadDB()
  return db.announcements
}

export async function apiAcknowledgeAnnouncement(id: string) {
  await delay(200, 400)
  const db = loadDB()
  db.announcements = db.announcements.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
  saveDB(db)
  return db.announcements
}

// ---------- today bundle + attention ----------

export function teamAwayToday() {
  const today = isoDate(daysFromToday(0))
  return TEAM_ROSTER.filter((m) => m.awayRanges.some((r) => r.start <= today && r.end >= today)).map(
    (m) => ({ name: m.name, avatarUrl: m.avatarUrl }),
  )
}

export function teamAwayThisWeek() {
  const start = isoDate(daysFromToday(0))
  const end = isoDate(daysFromToday(6))
  return TEAM_ROSTER.filter((m) => m.awayRanges.some((r) => r.start <= end && r.end >= start)).map((m) => ({
    name: m.name,
    avatarUrl: m.avatarUrl,
    dates: m.awayRanges.filter((r) => r.start <= end && r.end >= start).map((r) => `${r.start} → ${r.end}`),
  }))
}

export async function apiGetAttentionItems(employeeId: string): Promise<AttentionItem[]> {
  await delay(150, 300)
  const db = loadDB()
  const items: AttentionItem[] = []

  const attendance = db.attendance[employeeId] ?? []
  const yesterday = attendance.find((d) => d.date === isoDate(daysFromToday(-1)))
  if (yesterday && yesterday.checkIn && !yesterday.checkOut) {
    items.push({
      id: "att-missing-checkout",
      source: "missing-checkout",
      urgency: "overdue",
      title: "Missing checkout yesterday",
      detail: `You checked in at ${yesterday.checkIn.time} but never checked out.`,
      dueDate: yesterday.date,
      actionLabel: "Fix this",
      actionHref: "/time",
    })
  }

  for (const doc of db.documents[employeeId] ?? []) {
    if (doc.status === "expiring" && doc.expiresOn) {
      const daysLeft = Math.round((new Date(doc.expiresOn).getTime() - Date.now()) / 86_400_000)
      items.push({
        id: `att-doc-${doc.id}`,
        source: "document-expiring",
        urgency: daysLeft <= 7 ? "due-today" : daysLeft <= 30 ? "upcoming" : "info",
        title: `${doc.name} expiring soon`,
        detail: `Expires in ${daysLeft} days (${doc.expiresOn}). Upload a renewal to avoid a compliance gap.`,
        dueDate: doc.expiresOn,
        actionLabel: "Upload renewal",
        actionHref: "/me",
      })
    }
  }

  for (const ann of db.announcements) {
    if (ann.requiresAck && !ann.acknowledged) {
      items.push({
        id: `att-ann-${ann.id}`,
        source: "policy-ack",
        urgency: "due-today",
        title: ann.title,
        detail: "Acknowledgement requested by HR.",
        actionLabel: "Review & acknowledge",
        actionHref: "/support",
      })
    }
  }

  const profile = db.profiles[employeeId]
  if (profile && !profile.approvalGated.bankAccount.value) {
    items.push({
      id: "att-bank",
      source: "profile-incomplete",
      urgency: "upcoming",
      title: "Bank details missing",
      detail: "Payroll cannot be processed without a bank account on file.",
      actionLabel: "Add bank details",
      actionHref: "/me",
    })
  }

  for (const req of db.leaveRequests[employeeId] ?? []) {
    if (req.status === "pending") {
      const active = req.steps.find((s) => s.status === "active")
      if (active) {
        items.push({
          id: `att-leave-${req.id}`,
          source: "leave-info-needed",
          urgency: "info",
          title: `${req.type} leave — ${active.role === "hr" ? "with HR" : "with your manager"}`,
          detail: `Waiting on ${active.approverName} since ${req.appliedOn}.`,
          actionLabel: "Track request",
          actionHref: "/leave",
        })
      }
    }
  }

  const urgencyRank: Record<AttentionItem["urgency"], number> = {
    overdue: 0,
    "due-today": 1,
    upcoming: 2,
    info: 3,
  }
  return items.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency])
}

export { MANAGER_NAME, HR_NAME, DEMO_EMPLOYEE }

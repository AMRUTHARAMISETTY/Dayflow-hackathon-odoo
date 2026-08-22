import type {
  Announcement,
  AttendanceDay,
  CorrectionRequest,
  DayflowDatabase,
  DocumentRecord,
  Employee,
  LeaveBalance,
  LeaveRequest,
  PaySlip,
  PolicyDoc,
  Profile,
  Teammate,
  Ticket,
} from "../types"

const SHIFT_START = 9 * 60 // 09:00
const SHIFT_END = 18 * 60 // 18:00

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysFromToday(offset: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

export function minutesToClock(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${pad(h)}:${pad(m)}`
}

const AVATAR_PALETTE = ["#6366f1", "#0f5c4e", "#e8a33d", "#b4453c", "#0891b2", "#7c3aed"]

// Generated locally (not fetched) so avatars never depend on network access.
export function avatarFor(name: string) {
  const color = AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="32" y="32" dy="0.35em" text-anchor="middle" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="white">${initials}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const DEMO_EMPLOYEE: Employee = {
  id: "u-demo",
  employeeId: "EMP-1042",
  name: "Aanya Sharma",
  email: "aanya@dayflow.io",
  password: "demo1234",
  title: "Product Designer",
  department: "Design",
  manager: "Rohan Mehta",
  managerId: "mgr-rohan",
  avatarUrl: avatarFor("Aanya Sharma"),
}

export const MANAGER_NAME = "Rohan Mehta"
export const MANAGER_AWAY = true // scripted demo: any new request delegates to HR
export const HR_NAME = "Priya Nair"

export const TEAM_ROSTER: Teammate[] = [
  {
    name: "Karan Verma",
    avatarUrl: avatarFor("Karan Verma"),
    awayRanges: [{ start: isoDate(daysFromToday(4)), end: isoDate(daysFromToday(6)) }],
  },
  {
    name: "Meera Iyer",
    avatarUrl: avatarFor("Meera Iyer"),
    awayRanges: [{ start: isoDate(daysFromToday(5)), end: isoDate(daysFromToday(5)) }],
  },
  {
    name: "Devika Rao",
    avatarUrl: avatarFor("Devika Rao"),
    awayRanges: [{ start: isoDate(daysFromToday(-1)), end: isoDate(daysFromToday(1)) }],
  },
  {
    name: "Arjun Nambiar",
    avatarUrl: avatarFor("Arjun Nambiar"),
    awayRanges: [],
  },
  {
    name: "Sana Sheikh",
    avatarUrl: avatarFor("Sana Sheikh"),
    awayRanges: [{ start: isoDate(daysFromToday(6)), end: isoDate(daysFromToday(6)) }],
  },
  {
    name: "Vikram Das",
    avatarUrl: avatarFor("Vikram Das"),
    awayRanges: [],
  },
]

function buildAttendance(): AttendanceDay[] {
  const days: AttendanceDay[] = []

  // Today: not checked in yet — lets the check-in showpiece run live in a demo.
  days.push({
    date: isoDate(daysFromToday(0)),
    status: "present",
    shiftStartMinutes: SHIFT_START,
    shiftEndMinutes: SHIFT_END,
    segments: [],
  })

  // Yesterday: missing checkout — feeds the Day Rail's amber "Fix this" segment.
  days.push({
    date: isoDate(daysFromToday(-1)),
    status: "exception",
    shiftStartMinutes: SHIFT_START,
    shiftEndMinutes: SHIFT_END,
    checkIn: { time: "09:08", source: "web" },
    segments: [{ kind: "worked", startMinutes: 9 * 60 + 8, endMinutes: SHIFT_END }],
  })

  let i = 2
  let placed = 0
  while (placed < 22) {
    const d = daysFromToday(-i)
    i += 1
    const weekday = d.getDay()
    if (weekday === 0 || weekday === 6) continue
    placed += 1

    const roll = (d.getDate() + placed) % 11
    if (roll === 0) {
      days.push({
        date: isoDate(d),
        status: "absent",
        shiftStartMinutes: SHIFT_START,
        shiftEndMinutes: SHIFT_END,
        segments: [],
      })
    } else if (roll === 1) {
      days.push({
        date: isoDate(d),
        status: "leave",
        shiftStartMinutes: SHIFT_START,
        shiftEndMinutes: SHIFT_END,
        segments: [],
        leaveType: "Sick",
      })
    } else if (roll === 2) {
      days.push({
        date: isoDate(d),
        status: "half-day",
        shiftStartMinutes: SHIFT_START,
        shiftEndMinutes: SHIFT_END,
        checkIn: { time: "09:14", source: "web" },
        checkOut: { time: "13:32", source: "web" },
        segments: [{ kind: "worked", startMinutes: 9 * 60 + 14, endMinutes: 13 * 60 + 32 }],
      })
    } else if (roll === 3 && placed === 6) {
      // one exception with a resolved correction attached
      days.push({
        date: isoDate(d),
        status: "present",
        shiftStartMinutes: SHIFT_START,
        shiftEndMinutes: SHIFT_END,
        checkIn: { time: "09:41", source: "web" },
        checkOut: { time: "18:05", source: "web" },
        lateMinutes: 41,
        segments: [{ kind: "worked", startMinutes: 9 * 60 + 41, endMinutes: 18 * 60 + 5 }],
        correctionId: "corr-1",
      })
    } else {
      const inMin = 9 * 60 + (roll % 5)
      const outMin = 18 * 60 + (roll % 4)
      const overtime = roll >= 8
      const segments: AttendanceDay["segments"] = [
        { kind: "worked", startMinutes: inMin, endMinutes: 13 * 60 },
        { kind: "break", startMinutes: 13 * 60, endMinutes: 13 * 60 + 40 },
        { kind: "worked", startMinutes: 13 * 60 + 40, endMinutes: overtime ? SHIFT_END : outMin },
      ]
      if (overtime) segments.push({ kind: "overtime", startMinutes: SHIFT_END, endMinutes: outMin })
      days.push({
        date: isoDate(d),
        status: "present",
        shiftStartMinutes: SHIFT_START,
        shiftEndMinutes: SHIFT_END,
        checkIn: { time: minutesToClock(inMin), source: "web" },
        checkOut: { time: minutesToClock(outMin), source: "web" },
        segments,
      })
    }
  }

  return days.sort((a, b) => (a.date < b.date ? 1 : -1))
}

function buildCorrections(): CorrectionRequest[] {
  return [
    {
      id: "corr-1",
      date: isoDate(daysFromToday(-7)),
      issue: "wrong-time",
      correctedTime: "09:05",
      reason: "Badge reader was down at the east entrance, security logged me in manually at 09:05.",
      status: "approved",
      approverName: MANAGER_NAME,
      submittedAt: isoDate(daysFromToday(-6)),
      comment: "Confirmed with security desk log. Updated.",
    },
  ]
}

function buildLeaveBalances(): LeaveBalance[] {
  return [
    { type: "Paid", entitled: 18, taken: 4, pending: 2, accrualNote: "+1.5 days on the 1st" },
    { type: "Sick", entitled: 10, taken: 2, pending: 0, accrualNote: "+0.83 days on the 1st" },
    { type: "Unpaid", entitled: 0, taken: 1, pending: 0, accrualNote: "No accrual — deducted from pay" },
  ]
}

function buildLeaveRequests(): LeaveRequest[] {
  return [
    {
      id: "lv-approved",
      type: "Sick",
      startDate: isoDate(daysFromToday(-18)),
      endDate: isoDate(daysFromToday(-17)),
      halfDayStart: false,
      halfDayEnd: false,
      workingDays: 2,
      reason: "Fever, resting at home.",
      status: "approved",
      appliedOn: isoDate(daysFromToday(-19)),
      steps: [
        {
          role: "manager",
          approverName: MANAGER_NAME,
          status: "approved",
          actedAt: isoDate(daysFromToday(-18)),
          comment: "Get well soon!",
        },
      ],
    },
    {
      id: "lv-auto",
      type: "Paid",
      startDate: isoDate(daysFromToday(-10)),
      endDate: isoDate(daysFromToday(-10)),
      halfDayStart: false,
      halfDayEnd: false,
      workingDays: 1,
      reason: "Personal errand.",
      status: "approved",
      appliedOn: isoDate(daysFromToday(-11)),
      autoApprovedRule: "Leaves of 1 day or less auto-approve when balance is sufficient",
      steps: [
        {
          role: "manager",
          approverName: MANAGER_NAME,
          status: "approved",
          actedAt: isoDate(daysFromToday(-11)),
        },
      ],
    },
    {
      id: "lv-pending",
      type: "Paid",
      startDate: isoDate(daysFromToday(12)),
      endDate: isoDate(daysFromToday(14)),
      halfDayStart: false,
      halfDayEnd: false,
      workingDays: 3,
      reason: "Family trip planned in advance.",
      status: "pending",
      appliedOn: isoDate(daysFromToday(-2)),
      steps: [
        {
          role: "manager",
          approverName: HR_NAME,
          status: "active",
          delegatedFrom: MANAGER_NAME,
          delegationReason: "Your manager is on leave",
        },
        { role: "hr", approverName: HR_NAME, status: "waiting" },
      ],
    },
    {
      id: "lv-rejected",
      type: "Unpaid",
      startDate: isoDate(daysFromToday(-40)),
      endDate: isoDate(daysFromToday(-40)),
      halfDayStart: false,
      halfDayEnd: false,
      workingDays: 1,
      reason: "Personal matter.",
      status: "rejected",
      appliedOn: isoDate(daysFromToday(-41)),
      steps: [
        {
          role: "manager",
          approverName: MANAGER_NAME,
          status: "rejected",
          actedAt: isoDate(daysFromToday(-40)),
          comment: "Insufficient notice given the team deadline that week.",
        },
      ],
    },
  ]
}

function buildPaySlips(): PaySlip[] {
  const base = 95000
  const basic = Math.round(base * 0.5)
  const hra = Math.round(base * 0.22)
  const special = Math.round(base * 0.13)
  const pf = -Math.round(base * 0.06)
  const tax = -Math.round(base * 0.05)

  const may: PaySlip = {
    id: "slip-2026-05",
    month: "May",
    year: 2026,
    status: "Published",
    netPay: basic + hra + special + pf + tax,
    lineItems: [
      { label: "Basic Pay", amount: basic, group: "earnings" },
      { label: "HRA", amount: hra, group: "allowances" },
      { label: "Special Allowance", amount: special, group: "allowances" },
      { label: "Provident Fund", amount: pf, group: "deductions" },
      { label: "Professional Tax", amount: tax, group: "tax" },
    ],
  }

  const juneUnpaidDates = [isoDate(daysFromToday(-52)), isoDate(daysFromToday(-51))]
  const juneDeduction = -Math.round((base / 30) * juneUnpaidDates.length)
  const june: PaySlip = {
    id: "slip-2026-06",
    month: "June",
    year: 2026,
    status: "Published",
    netPay: basic + hra + special + pf + tax + juneDeduction,
    lineItems: [
      { label: "Basic Pay", amount: basic, group: "earnings" },
      { label: "HRA", amount: hra, group: "allowances" },
      { label: "Special Allowance", amount: special, group: "allowances" },
      { label: "Provident Fund", amount: pf, group: "deductions" },
      { label: "Professional Tax", amount: tax, group: "tax" },
      {
        label: "Unpaid Leave Deduction",
        amount: juneDeduction,
        group: "deductions",
        linkedDates: juneUnpaidDates,
      },
    ],
  }

  const julyOvertimeDates = [isoDate(daysFromToday(-20))]
  const julyOvertime = Math.round((base / 30 / 8) * 3 * julyOvertimeDates.length)
  const july: PaySlip = {
    id: "slip-2026-07",
    month: "July",
    year: 2026,
    status: "Published",
    netPay: basic + hra + special + pf + tax + julyOvertime,
    lineItems: [
      { label: "Basic Pay", amount: basic, group: "earnings" },
      { label: "HRA", amount: hra, group: "allowances" },
      { label: "Special Allowance", amount: special, group: "allowances" },
      {
        label: "Overtime Pay",
        amount: julyOvertime,
        group: "earnings",
        linkedDates: julyOvertimeDates,
      },
      { label: "Provident Fund", amount: pf, group: "deductions" },
      { label: "Professional Tax", amount: tax, group: "tax" },
    ],
  }

  return [may, june, july]
}

function buildAnnouncements(): Announcement[] {
  return [
    {
      id: "ann-1",
      title: "Updated remote-work policy — acknowledgement required",
      body: "We've clarified the hybrid attendance expectations for Design and Engineering. Please read and acknowledge by Friday.",
      pinned: true,
      requiresAck: true,
      acknowledged: false,
      postedOn: isoDate(daysFromToday(-2)),
    },
    {
      id: "ann-2",
      title: "Office closed 15 August — public holiday",
      body: "The Bengaluru office will be closed for Independence Day. Attendance is not required.",
      pinned: false,
      requiresAck: false,
      acknowledged: true,
      postedOn: isoDate(daysFromToday(-6)),
    },
  ]
}

function buildDocuments(): DocumentRecord[] {
  return [
    { id: "doc-1", name: "Offer Letter.pdf", kind: "issued", status: "available", sizeLabel: "212 KB" },
    { id: "doc-2", name: "PAN Card.pdf", kind: "uploaded", status: "verified", sizeLabel: "88 KB" },
    {
      id: "doc-3",
      name: "Passport.pdf",
      kind: "uploaded",
      status: "expiring",
      expiresOn: isoDate(daysFromToday(27)),
      sizeLabel: "1.1 MB",
    },
  ]
}

function buildPolicies(): PolicyDoc[] {
  return [
    {
      id: "pol-1",
      title: "Leave & Time-Off Policy",
      category: "Leave",
      effectiveDate: "2026-01-01",
      version: "v3.2",
      summary: "Entitlements, carry-forward rules, and the approval matrix by leave type and duration.",
    },
    {
      id: "pol-2",
      title: "Remote & Hybrid Work Policy",
      category: "Attendance",
      effectiveDate: "2026-08-01",
      version: "v2.0",
      summary: "Core hours, in-office days by team, and how attendance is recorded for remote days.",
    },
    {
      id: "pol-3",
      title: "Expense & Reimbursement Policy",
      category: "Finance",
      effectiveDate: "2025-11-15",
      version: "v1.4",
      summary: "What's reimbursable, submission windows, and approval thresholds.",
    },
  ]
}

function buildProfile(): Profile {
  return {
    personal: {
      address: { value: "HSR Layout, Bengaluru, KA 560102", state: "saved" },
      phone: { value: "+91 98765 43210", state: "saved" },
      emergencyContact: { value: "+91 91234 56789", state: "saved" },
      personalEmail: { value: "aanya.personal@gmail.com", state: "saved" },
    },
    approvalGated: {
      name: { value: "Aanya Sharma", state: "saved" },
      bankAccount: { value: "", state: "saved" },
      taxDeclaration: {
        value: "Old regime, 80C: ₹1,20,000",
        state: "rejected",
        rejectionReason: "Investment proof missing for ELSS entry — please re-upload with receipt.",
      },
    },
    readOnly: {
      employeeId: DEMO_EMPLOYEE.employeeId,
      department: DEMO_EMPLOYEE.department,
      manager: DEMO_EMPLOYEE.manager,
      designation: DEMO_EMPLOYEE.title,
      joiningDate: "2023-02-06",
      employmentType: "Full-time",
    },
    avatarUrl: DEMO_EMPLOYEE.avatarUrl,
  }
}

function buildTickets(): Ticket[] {
  return []
}

export function seedDatabase(): DayflowDatabase {
  const id = DEMO_EMPLOYEE.id
  return {
    employees: [DEMO_EMPLOYEE],
    profiles: { [id]: buildProfile() },
    attendance: { [id]: buildAttendance() },
    corrections: { [id]: buildCorrections() },
    leaveBalances: { [id]: buildLeaveBalances() },
    leaveRequests: { [id]: buildLeaveRequests() },
    teamAway: { [id]: [] },
    paySlips: { [id]: buildPaySlips() },
    announcements: buildAnnouncements(),
    documents: { [id]: buildDocuments() },
    tickets: { [id]: buildTickets() },
    policies: buildPolicies(),
  }
}

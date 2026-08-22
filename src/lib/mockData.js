// Seed data + helpers for the mock HRMS backend.
// Everything here is fake and lives in localStorage — no real API.

const AVATAR_COLORS = ['6366f1', '06b6d4', 'f97316', 'ec4899', '22c55e', 'a855f7']

function avatarFor(name) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${color}`
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// Build a plausible attendance history for the last N weekdays.
function buildAttendance(seedOffset = 0) {
  const records = []
  let cursor = new Date()
  let count = 0
  let i = 0
  while (count < 30) {
    const day = daysAgo(i)
    i += 1
    const weekday = day.getDay()
    if (weekday === 0 || weekday === 6) continue // skip weekends
    count += 1

    const roll = (day.getDate() + seedOffset) % 10
    let status = 'present'
    if (roll === 0) status = 'absent'
    else if (roll === 1) status = 'half-day'
    else if (roll === 2) status = 'leave'

    const record = { date: isoDate(day), status }
    if (status === 'present') {
      record.checkIn = '09:1' + (roll % 5)
      record.checkOut = '18:0' + (roll % 5)
    } else if (status === 'half-day') {
      record.checkIn = '09:20'
      record.checkOut = '13:30'
    }
    records.push(record)
  }
  return records.sort((a, b) => (a.date < b.date ? 1 : -1))
}

function buildLeaveRequests(userId) {
  return [
    {
      id: `${userId}-lv-1`,
      type: 'Sick',
      startDate: isoDate(daysAgo(18)),
      endDate: isoDate(daysAgo(17)),
      remarks: 'Fever, resting at home.',
      status: 'approved',
      comment: 'Get well soon!',
      appliedOn: isoDate(daysAgo(19)),
    },
    {
      id: `${userId}-lv-2`,
      type: 'Paid',
      startDate: isoDate(daysAgo(-4)),
      endDate: isoDate(daysAgo(-6)),
      remarks: 'Family trip planned in advance.',
      status: 'pending',
      comment: '',
      appliedOn: isoDate(daysAgo(2)),
    },
    {
      id: `${userId}-lv-3`,
      type: 'Unpaid',
      startDate: isoDate(daysAgo(40)),
      endDate: isoDate(daysAgo(40)),
      remarks: 'Personal matter.',
      status: 'rejected',
      comment: 'Insufficient notice given team deadline.',
      appliedOn: isoDate(daysAgo(41)),
    },
  ]
}

function buildPayroll(base) {
  const allowances = Math.round(base * 0.22)
  const deductions = Math.round(base * 0.09)
  const net = base + allowances - deductions
  const months = ['May', 'June', 'July']
  return {
    baseSalary: base,
    allowances,
    deductions,
    netPay: net,
    breakdown: [
      { label: 'Basic Pay', amount: Math.round(base * 0.6) },
      { label: 'HRA', amount: Math.round(base * 0.25) },
      { label: 'Special Allowance', amount: Math.round(base * 0.15) },
      { label: 'Provident Fund', amount: -Math.round(base * 0.06) },
      { label: 'Professional Tax', amount: -Math.round(base * 0.03) },
    ],
    slips: months.map((m, i) => ({
      id: `slip-${m}`,
      month: m,
      year: 2026,
      netPay: net - i * 400,
      status: 'Paid',
    })),
  }
}

export function seedDatabase() {
  const demo = {
    id: 'u-demo',
    employeeId: 'EMP-1042',
    name: 'Aanya Sharma',
    email: 'aanya@dayflow.io',
    password: 'demo1234',
    role: 'employee',
  }

  const users = [demo]
  const profiles = {
    [demo.id]: {
      personal: {
        fullName: demo.name,
        dob: '1998-04-12',
        gender: 'Female',
        phone: '+91 98765 43210',
        address: 'HSR Layout, Bengaluru, KA 560102',
        emergencyContact: '+91 91234 56789',
      },
      job: {
        title: 'Product Designer',
        department: 'Design',
        manager: 'Rohan Mehta',
        joinDate: '2023-02-06',
        employmentType: 'Full-time',
        location: 'Bengaluru (Hybrid)',
      },
      documents: [
        { name: 'Offer Letter.pdf', size: '212 KB' },
        { name: 'PAN Card.pdf', size: '88 KB' },
        { name: 'Aadhaar Card.pdf', size: '104 KB' },
      ],
      avatarUrl: avatarFor(demo.name),
    },
  }

  const attendance = { [demo.id]: buildAttendance(0) }
  const leaveRequests = { [demo.id]: buildLeaveRequests(demo.id) }
  const payroll = { [demo.id]: buildPayroll(95000) }

  return { users, profiles, attendance, leaveRequests, payroll }
}

export function newUserBundle({ id, employeeId, name, email, password, role }) {
  const baseSalary = 55000 + Math.round(Math.random() * 30000)
  return {
    user: { id, employeeId, name, email, password, role },
    profile: {
      personal: {
        fullName: name,
        dob: '',
        gender: '',
        phone: '',
        address: '',
        emergencyContact: '',
      },
      job: {
        title: role === 'hr' ? 'HR Officer' : 'Employee',
        department: role === 'hr' ? 'Human Resources' : 'General',
        manager: 'Unassigned',
        joinDate: isoDate(new Date()),
        employmentType: 'Full-time',
        location: 'Remote',
      },
      documents: [],
      avatarUrl: avatarFor(name),
    },
    attendance: buildAttendance(id.length),
    leaveRequests: buildLeaveRequests(id),
    payroll: buildPayroll(baseSalary),
  }
}

export const LEAVE_TYPES = ['Paid', 'Sick', 'Unpaid']
export const ATTENDANCE_STATUS_META = {
  present: { label: 'Present', color: '#22c55e' },
  absent: { label: 'Absent', color: '#ef4444' },
  'half-day': { label: 'Half-day', color: '#f59e0b' },
  leave: { label: 'On Leave', color: '#6366f1' },
}

import type { AttentionItem, LeaveRequest, PaySlip } from "../types"
import { teamAwayThisWeek } from "./mockApi"
import { daysFromToday, isoDate } from "./mockData"

export interface MascotMessageInputs {
  attention: AttentionItem[] | undefined
  leaveRequests: LeaveRequest[] | undefined
  paySlips: PaySlip[] | undefined
  workedMinutes: number
}

function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

/** Most-urgent-first list of things the dino can say, drawn from live app state. */
export function buildMascotMessages({ attention, leaveRequests, paySlips, workedMinutes }: MascotMessageInputs): string[] {
  const messages: string[] = []
  const today = isoDate(daysFromToday(0))

  const missingCheckout = attention?.find((item) => item.source === "missing-checkout")
  if (missingCheckout) messages.push("You forgot to check out yesterday")

  const expiringDoc = attention?.find((item) => item.source === "document-expiring")
  if (expiringDoc?.dueDate) {
    const days = daysUntil(expiringDoc.dueDate)
    if (days <= 30) messages.push(`Your ID proof expires in ${Math.max(days, 0)} days`)
  }

  const approvedLeave = leaveRequests?.find((req) => req.status === "approved" && req.endDate >= today)
  if (approvedLeave) messages.push("Your leave was approved")

  const latestSlip = paySlips?.[paySlips.length - 1]
  if (latestSlip) messages.push(`Payslip for ${latestSlip.month} is ready`)

  const away = teamAwayThisWeek()
  if (away.length > 0) {
    const firstDate = away[0].dates[0]?.split(" ")[0]
    const dayLabel = firstDate
      ? new Date(`${firstDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" })
      : "this week"
    messages.push(`${away.length} of your team ${away.length === 1 ? "is" : "are"} away ${dayLabel}`)
  }

  const policyAck = attention?.find((item) => item.source === "policy-ack")
  if (policyAck) messages.push("New leave policy — please acknowledge")

  const hours = Math.floor(workedMinutes / 60)
  if (hours >= 3) {
    messages.push(`You've been at it ${hours} hours. Take a break soon?`)
  } else if (messages.length === 0) {
    messages.push("Ready when you are.")
  }

  return messages
}

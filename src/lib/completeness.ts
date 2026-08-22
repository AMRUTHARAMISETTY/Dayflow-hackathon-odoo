import type { Profile } from "../types"

export function computeCompleteness(profile: Profile) {
  const checks: { label: string; ok: boolean; reason: string }[] = [
    { label: "Address", ok: !!profile.personal.address.value, reason: "Needed for compliance mailings" },
    { label: "Phone", ok: !!profile.personal.phone.value, reason: "Needed for urgent contact" },
    {
      label: "Emergency contact",
      ok: !!profile.personal.emergencyContact.value,
      reason: "Needed in case of a workplace emergency",
    },
    {
      label: "Bank details",
      ok: !!profile.approvalGated.bankAccount.value,
      reason: "Payroll cannot be processed",
    },
    {
      label: "Tax declaration",
      ok: profile.approvalGated.taxDeclaration.state !== "rejected",
      reason: "Rejected — needs a corrected re-submission",
    },
  ]
  const okCount = checks.filter((c) => c.ok).length
  return { percent: Math.round((okCount / checks.length) * 100), missing: checks.filter((c) => !c.ok) }
}

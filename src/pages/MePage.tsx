import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import PageHeader from "../components/ui/PageHeader"
import Card from "../components/ui/Card"
import { CardSkeleton } from "../components/ui/Skeleton"
import ErrorState from "../components/ui/ErrorState"
import OfflineBanner from "../components/ui/OfflineBanner"
import CompletenessMeter from "../components/profile/CompletenessMeter"
import FieldRow from "../components/profile/FieldRow"
import DocumentsList from "../components/profile/DocumentsList"
import { useAuth } from "../lib/auth"
import { useDocumentsQuery, useProfileQuery } from "../lib/queries"
import { apiRequestFieldChange, apiUpdatePersonalField } from "../lib/mockApi"

export default function MePage() {
  const { user } = useAuth()
  const profileQuery = useProfileQuery()
  const documentsQuery = useDocumentsQuery()
  const queryClient = useQueryClient()

  const personalMutation = useMutation({
    mutationFn: ({ field, value }: { field: "address" | "phone" | "emergencyContact" | "personalEmail"; value: string }) =>
      apiUpdatePersonalField(user!.id, field, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  })

  const gatedMutation = useMutation({
    mutationFn: ({ field, value }: { field: "name" | "bankAccount" | "taxDeclaration"; value: string }) =>
      apiRequestFieldChange(user!.id, field, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      queryClient.invalidateQueries({ queryKey: ["attention"] })
    },
  })

  if (profileQuery.isLoading) return <CardSkeleton lines={6} />
  if (profileQuery.isError || !profileQuery.data)
    return <ErrorState message="Couldn't load your profile." onRetry={() => profileQuery.refetch()} />

  const profile = profileQuery.data

  return (
    <div>
      <PageHeader eyebrow="Me" title="My profile" subtitle="Is my information complete and current?" />
      <OfflineBanner />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card className="flex flex-col items-center p-6 text-center">
            <img src={profile.avatarUrl} alt={user?.name} className="mb-3 h-20 w-20 rounded-full" />
            <h2 className="font-bold text-ink font-display">{user?.name}</h2>
            <p className="text-sm text-slate">{profile.readOnly.designation}</p>
            <p className="mt-1 font-mono-tabular text-xs text-slate">{profile.readOnly.employeeId}</p>
          </Card>
          <CompletenessMeter profile={profile} />
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-ink">Security and devices</h2>
            <p className="mt-1 text-xs text-slate">Set up fingerprint, Face ID, Windows Hello, or another passkey.</p>
            <Link to="/security" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-meridian px-4 text-sm font-semibold text-white">Manage passkeys</Link>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card delay={0.05}>
            <h2 className="mb-1 text-sm font-semibold text-slate">Personal details</h2>
            <p className="mb-2 text-xs text-slate">Editable instantly.</p>
            <div className="divide-y divide-ink/5">
              <FieldRow
                label="Address"
                field={profile.personal.address}
                onSave={(v) => personalMutation.mutate({ field: "address", value: v })}
              />
              <FieldRow
                label="Phone"
                field={profile.personal.phone}
                onSave={(v) => personalMutation.mutate({ field: "phone", value: v })}
              />
              <FieldRow
                label="Emergency contact"
                field={profile.personal.emergencyContact}
                onSave={(v) => personalMutation.mutate({ field: "emergencyContact", value: v })}
              />
              <FieldRow
                label="Personal email"
                field={profile.personal.personalEmail}
                onSave={(v) => personalMutation.mutate({ field: "personalEmail", value: v })}
              />
            </div>
          </Card>

          <Card delay={0.1}>
            <h2 className="mb-1 text-sm font-semibold text-slate">Sensitive details</h2>
            <p className="mb-2 text-xs text-slate">Changes need HR approval before they take effect.</p>
            <div className="divide-y divide-ink/5">
              <FieldRow
                label="Legal name"
                field={profile.approvalGated.name}
                onSave={(v) => gatedMutation.mutate({ field: "name", value: v })}
              />
              <FieldRow
                label="Bank account"
                field={profile.approvalGated.bankAccount}
                onSave={(v) => gatedMutation.mutate({ field: "bankAccount", value: v })}
              />
              <FieldRow
                label="Tax declaration"
                field={profile.approvalGated.taxDeclaration}
                onSave={(v) => gatedMutation.mutate({ field: "taxDeclaration", value: v })}
              />
            </div>
          </Card>

          <Card delay={0.15}>
            <h2 className="mb-2 text-sm font-semibold text-slate">Job details</h2>
            <p className="mb-2 text-xs text-slate">Read-only — contact HR to change.</p>
            <div className="divide-y divide-ink/5 text-sm">
              {Object.entries({
                Department: profile.readOnly.department,
                Manager: profile.readOnly.manager,
                Designation: profile.readOnly.designation,
                "Joining date": profile.readOnly.joiningDate,
                "Employment type": profile.readOnly.employmentType,
              }).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2">
                  <span className="text-slate">{k}</span>
                  <span className="text-ink">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {documentsQuery.data && <DocumentsList documents={documentsQuery.data} />}
        </div>
      </div>
    </div>
  )
}

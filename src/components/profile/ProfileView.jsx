import { motion } from 'framer-motion'
import { FileText, Briefcase, Wallet2, Pencil } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useStore } from '../../lib/store'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-ink-900/45">{label}</span>
      <span className="font-medium text-ink-900">{value || '—'}</span>
    </div>
  )
}

export default function ProfileView({ onEdit }) {
  const { currentUser, profile, payroll } = useStore()
  const { personal, job, documents } = profile

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1 flex flex-col items-center p-6 text-center">
        <img
          src={profile.avatarUrl}
          alt={currentUser.name}
          className="mb-4 h-24 w-24 rounded-full border-4 border-white shadow-lg object-cover"
        />
        <h2 className="text-lg font-bold text-ink-900 font-display">{personal.fullName}</h2>
        <p className="text-sm text-ink-900/45">{job.title}</p>
        <p className="mt-1 text-xs text-ink-900/35">{currentUser.employeeId}</p>
        <Button variant="ghost" className="mt-4 w-full" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit profile
        </Button>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <Card delay={0.05}>
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink-900">
            <FileText className="h-4 w-4 text-brand-500" /> Personal details
          </h3>
          <div className="divide-y divide-black/5">
            <Row label="Full name" value={personal.fullName} />
            <Row label="Date of birth" value={personal.dob} />
            <Row label="Gender" value={personal.gender} />
            <Row label="Phone" value={personal.phone} />
            <Row label="Address" value={personal.address} />
            <Row label="Emergency contact" value={personal.emergencyContact} />
          </div>
        </Card>

        <Card delay={0.1}>
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink-900">
            <Briefcase className="h-4 w-4 text-brand-500" /> Job details
          </h3>
          <div className="divide-y divide-black/5">
            <Row label="Title" value={job.title} />
            <Row label="Department" value={job.department} />
            <Row label="Manager" value={job.manager} />
            <Row label="Joined" value={job.joinDate} />
            <Row label="Employment type" value={job.employmentType} />
            <Row label="Location" value={job.location} />
          </div>
        </Card>

        <Card delay={0.15}>
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink-900">
            <Wallet2 className="h-4 w-4 text-brand-500" /> Salary structure
          </h3>
          <p className="mb-1 text-xs text-ink-900/40">Read-only — contact HR for changes.</p>
          <div className="divide-y divide-black/5">
            {payroll.breakdown.map((b) => (
              <Row key={b.label} label={b.label} value={`₹${b.amount.toLocaleString('en-IN')}`} />
            ))}
          </div>
        </Card>

        <Card delay={0.2}>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
            <FileText className="h-4 w-4 text-brand-500" /> Documents
          </h3>
          {documents.length === 0 ? (
            <p className="text-sm text-ink-900/40">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <motion.div
                  key={doc.name}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg bg-black/[0.02] px-3 py-2 text-sm"
                >
                  <span className="text-ink-900/75">{doc.name}</span>
                  <span className="text-xs text-ink-900/35">{doc.size}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

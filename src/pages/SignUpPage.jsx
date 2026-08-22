import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, ShieldCheck, MailCheck } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import Field, { TextInput } from '../components/ui/Field'
import Button from '../components/ui/Button'
import { useStore } from '../lib/store'

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'hr', label: 'HR Officer' },
]

function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[0-9]/.test(pw)) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

export default function SignUpPage() {
  const { signUp } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    email: '',
    password: '',
    role: 'employee',
  })
  const [error, setError] = useState('')
  const [phase, setPhase] = useState('form') // form | verifying | done

  const strength = passwordStrength(form.password)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (strength < 3) {
      setError('Use at least 8 characters, a number, and an uppercase letter.')
      return
    }
    const res = signUp(form)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setPhase('verifying')
    setTimeout(() => setPhase('done'), 1400)
    setTimeout(() => navigate('/dashboard'), 2400)
  }

  if (phase !== 'form') {
    return (
      <AuthLayout title="Almost there" subtitle="">
        <div className="flex flex-col items-center py-6 text-center">
          <AnimatePresence mode="wait">
            {phase === 'verifying' ? (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="h-12 w-12 rounded-full border-2 border-accent-400/30 border-t-accent-400"
                />
                <p className="text-sm text-white/60 flex items-center gap-2">
                  <MailCheck className="h-4 w-4 text-accent-400" /> Verifying your email…
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                  <ShieldCheck className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-white">
                  Account verified! Taking you to your dashboard…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join Dayflow in a few seconds">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name">
            <TextInput name="name" required value={form.name} onChange={handleChange} placeholder="Jordan Lee" />
          </Field>
          <Field label="Employee ID">
            <TextInput
              name="employeeId"
              required
              value={form.employeeId}
              onChange={handleChange}
              placeholder="EMP-2031"
            />
          </Field>
        </div>
        <Field label="Email">
          <TextInput
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Password" error={error}>
          <TextInput
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
          <div className="mt-2 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{
                  backgroundColor:
                    i < strength ? ['#ef4444', '#f59e0b', '#eab308', '#22c55e'][strength - 1] : 'rgba(255,255,255,0.1)',
                }}
                className="h-1 flex-1 rounded-full"
              />
            ))}
          </div>
        </Field>
        <Field label="Role">
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  form.role === r.value
                    ? 'border-accent-400/60 bg-accent-400/10 text-accent-300'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Field>

        <Button type="submit" className="w-full mt-2">
          <UserPlus className="h-4 w-4" /> Sign Up
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link to="/sign-in" className="font-medium text-accent-400 hover:text-accent-300">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

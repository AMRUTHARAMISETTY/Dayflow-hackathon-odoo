import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Sparkles } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import Field, { TextInput } from '../components/ui/Field'
import Button from '../components/ui/Button'
import { useStore } from '../lib/store'

export default function SignInPage() {
  const { signIn, pushToast } = useStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: 'aanya@dayflow.io', password: 'demo1234' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      const res = signIn(form)
      setLoading(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
      pushToast('Welcome back! Redirecting to your dashboard…')
      navigate('/dashboard')
    }, 450)
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Dayflow workspace">
      <form onSubmit={handleSubmit}>
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
        </Field>

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
            />
          ) : (
            <>
              <LogIn className="h-4 w-4" /> Sign In
            </>
          )}
        </Button>
      </form>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/40">
        <Sparkles className="h-3.5 w-3.5 text-accent-400 shrink-0" />
        Demo credentials are pre-filled — just hit Sign In.
      </div>

      <p className="mt-6 text-center text-sm text-white/40">
        New here?{' '}
        <Link to="/sign-up" className="font-medium text-accent-400 hover:text-accent-300">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

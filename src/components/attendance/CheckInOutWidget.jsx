import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, LogOut, Clock } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { useStore } from '../../lib/store'

export default function CheckInOutWidget() {
  const { attendance, checkInOut, pushToast } = useStore()
  const [now, setNow] = useState(new Date())
  const [burst, setBurst] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const today = now.toISOString().slice(0, 10)
  const todayRecord = attendance.find((a) => a.date === today)
  const state = !todayRecord?.checkIn ? 'idle' : !todayRecord?.checkOut ? 'in' : 'out'

  function handleClick() {
    if (state === 'idle') {
      checkInOut('in')
      pushToast('Checked in — have a great day!')
    } else if (state === 'in') {
      checkInOut('out')
      pushToast('Checked out. See you tomorrow!')
    }
    setBurst(true)
    setTimeout(() => setBurst(false), 700)
  }

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="flex flex-col items-center text-center">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-900/40">
          <Clock className="h-3.5 w-3.5" /> {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
        <motion.p
          key={now.getSeconds()}
          className="mb-5 font-display text-4xl font-bold text-ink-900 tabular-nums"
        >
          {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </motion.p>

        <div className="relative">
          <AnimatePresence>
            {burst && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: 2.4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={`absolute inset-0 rounded-full ${state === 'out' ? 'bg-ink-900/10' : 'bg-emerald-400/30'}`}
              />
            )}
          </AnimatePresence>

          {state !== 'out' ? (
            <Button
              onClick={handleClick}
              variant={state === 'idle' ? 'primary' : 'danger'}
              className="relative h-16 w-48 text-base"
            >
              {state === 'idle' ? (
                <motion.span
                  animate={{ boxShadow: ['0 0 0 0 rgba(99,102,241,0.4)', '0 0 0 12px rgba(99,102,241,0)'] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="absolute inset-0 rounded-xl"
                />
              ) : null}
              {state === 'idle' ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
              {state === 'idle' ? 'Check In' : 'Check Out'}
            </Button>
          ) : (
            <div className="flex h-16 w-48 flex-col items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <span className="text-sm font-semibold">Day complete ✓</span>
              <span className="text-xs text-emerald-600/70">
                {todayRecord.checkIn} – {todayRecord.checkOut}
              </span>
            </div>
          )}
        </div>

        {state === 'in' && todayRecord?.checkIn && (
          <p className="mt-3 text-xs text-ink-900/40">Checked in at {todayRecord.checkIn}</p>
        )}
      </div>
    </Card>
  )
}

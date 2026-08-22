import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { seedDatabase, newUserBundle } from './mockData'

const DB_KEY = 'dayflow_db'
const SESSION_KEY = 'dayflow_session'

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to reseed
  }
  const seeded = seedDatabase()
  localStorage.setItem(DB_KEY, JSON.stringify(seeded))
  return seeded
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(loadDB)
  const [userId, setUserId] = useState(() => localStorage.getItem(SESSION_KEY) || null)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    saveDB(db)
  }, [db])

  useEffect(() => {
    if (userId) localStorage.setItem(SESSION_KEY, userId)
    else localStorage.removeItem(SESSION_KEY)
  }, [userId])

  const pushToast = useCallback((message, variant = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, variant }])
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id))
  }, [])

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === userId) || null,
    [db.users, userId],
  )

  const signUp = useCallback(
    ({ employeeId, name, email, password, role }) => {
      const exists = db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())
      if (exists) return { ok: false, error: 'An account with this email already exists.' }

      const id = `u-${Date.now().toString(36)}`
      const bundle = newUserBundle({ id, employeeId, name, email, password, role })

      setDb((prev) => ({
        users: [...prev.users, bundle.user],
        profiles: { ...prev.profiles, [id]: bundle.profile },
        attendance: { ...prev.attendance, [id]: bundle.attendance },
        leaveRequests: { ...prev.leaveRequests, [id]: bundle.leaveRequests },
        payroll: { ...prev.payroll, [id]: bundle.payroll },
      }))
      setUserId(id)
      return { ok: true }
    },
    [db.users],
  )

  const signIn = useCallback(
    ({ email, password }) => {
      const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      if (!user) return { ok: false, error: 'No account found with that email.' }
      if (user.password !== password) return { ok: false, error: 'Incorrect password.' }
      setUserId(user.id)
      return { ok: true }
    },
    [db.users],
  )

  const signOut = useCallback(() => {
    setUserId(null)
  }, [])

  const updateProfile = useCallback(
    (patch) => {
      if (!userId) return
      setDb((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          [userId]: {
            ...prev.profiles[userId],
            personal: { ...prev.profiles[userId].personal, ...patch },
          },
        },
      }))
    },
    [userId],
  )

  const updateAvatar = useCallback(
    (avatarUrl) => {
      if (!userId) return
      setDb((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          [userId]: { ...prev.profiles[userId], avatarUrl },
        },
      }))
    },
    [userId],
  )

  const checkInOut = useCallback(
    (action) => {
      if (!userId) return
      const today = new Date().toISOString().slice(0, 10)
      const now = new Date()
      const timeStr = now.toTimeString().slice(0, 5)

      setDb((prev) => {
        const list = prev.attendance[userId] || []
        const idx = list.findIndex((r) => r.date === today)
        let updated
        if (idx === -1) {
          updated = [{ date: today, status: 'present', checkIn: timeStr }, ...list]
        } else {
          updated = list.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  status: 'present',
                  checkIn: r.checkIn || (action === 'in' ? timeStr : r.checkIn),
                  checkOut: action === 'out' ? timeStr : r.checkOut,
                }
              : r,
          )
        }
        return { ...prev, attendance: { ...prev.attendance, [userId]: updated } }
      })
    },
    [userId],
  )

  const applyLeave = useCallback(
    ({ type, startDate, endDate, remarks }) => {
      if (!userId) return
      const id = `${userId}-lv-${Date.now().toString(36)}`
      const newRequest = {
        id,
        type,
        startDate,
        endDate,
        remarks,
        status: 'pending',
        comment: '',
        appliedOn: new Date().toISOString().slice(0, 10),
      }
      setDb((prev) => ({
        ...prev,
        leaveRequests: {
          ...prev.leaveRequests,
          [userId]: [newRequest, ...(prev.leaveRequests[userId] || [])],
        },
      }))
      return newRequest
    },
    [userId],
  )

  const value = useMemo(
    () => ({
      currentUser,
      profile: currentUser ? db.profiles[currentUser.id] : null,
      attendance: currentUser ? db.attendance[currentUser.id] || [] : [],
      leaveRequests: currentUser ? db.leaveRequests[currentUser.id] || [] : [],
      payroll: currentUser ? db.payroll[currentUser.id] : null,
      signUp,
      signIn,
      signOut,
      updateProfile,
      updateAvatar,
      checkInOut,
      applyLeave,
      toasts,
      pushToast,
      dismissToast,
    }),
    [currentUser, db, signUp, signIn, signOut, updateProfile, updateAvatar, checkInOut, applyLeave, toasts, pushToast, dismissToast],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import ProfileView from '../components/profile/ProfileView'
import ProfileEditForm from '../components/profile/ProfileEditForm'

export default function ProfilePage() {
  const [editing, setEditing] = useState(false)

  return (
    <div>
      <PageHeader eyebrow="Profile" title="My profile" subtitle="Your personal, job, and salary information." />

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-md"
          >
            <Card>
              <h3 className="mb-4 font-semibold text-ink-900">Edit personal details</h3>
              <ProfileEditForm onDone={() => setEditing(false)} />
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <ProfileView onEdit={() => setEditing(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

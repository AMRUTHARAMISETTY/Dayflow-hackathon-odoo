import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Save } from 'lucide-react'
import Field, { TextInput, TextArea } from '../ui/Field'
import Button from '../ui/Button'
import { useStore } from '../../lib/store'

export default function ProfileEditForm({ onDone }) {
  const { profile, updateProfile, updateAvatar, pushToast } = useStore()
  const [form, setForm] = useState(profile.personal)
  const fileRef = useRef(null)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateAvatar(reader.result)
    reader.readAsDataURL(file)
  }

  function handleSubmit(e) {
    e.preventDefault()
    updateProfile(form)
    pushToast('Profile updated successfully.')
    onDone?.()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-5 flex items-center gap-4">
        <div className="group relative">
          <img
            src={profile.avatarUrl}
            alt="avatar"
            className="h-16 w-16 rounded-full border border-black/5 object-cover"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Camera className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
        </div>
        <p className="text-xs text-ink-900/40">Click your photo to change it.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" dark={false}>
          <TextInput dark={false} name="phone" value={form.phone} onChange={handleChange} />
        </Field>
        <Field label="Emergency contact" dark={false}>
          <TextInput
            dark={false}
            name="emergencyContact"
            value={form.emergencyContact}
            onChange={handleChange}
          />
        </Field>
      </div>
      <Field label="Address" dark={false}>
        <TextArea dark={false} rows={2} name="address" value={form.address} onChange={handleChange} />
      </Field>

      <div className="flex gap-2 mt-2">
        <Button type="submit" className="flex-1">
          <Save className="h-4 w-4" /> Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

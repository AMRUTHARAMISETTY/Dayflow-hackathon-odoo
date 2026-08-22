import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, registerPasskey } from "../lib/api"

export default function SecurityDevicesPage() {
  const queryClient = useQueryClient(); const [message, setMessage] = useState("")
  const sessions = useQuery({ queryKey: ["security-sessions"], queryFn: () => api<Record<string, unknown>[]>("/api/auth/sessions") })
  const passkeys = useQuery({ queryKey: ["passkeys"], queryFn: () => api<Record<string, unknown>[]>("/api/auth/passkeys") })
  const revokeSession = useMutation({ mutationFn: (id: string) => api(`/api/auth/sessions/${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["security-sessions"] }) })
  const removePasskey = useMutation({ mutationFn: (id: string) => api(`/api/auth/passkeys/${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["passkeys"] }) })
  const enroll = useMutation({ mutationFn: () => registerPasskey(navigator.platform || "This device"), onSuccess: () => { setMessage("Passkey added. A security confirmation has been recorded."); queryClient.invalidateQueries({ queryKey: ["passkeys"] }) }, onError: (error) => setMessage(error.message) })
  return <main className="security-page"><h1>Security and devices</h1><p>Manage signed-in browsers and passkeys. Approximate locations are intentionally imprecise.</p>
    <section><h2>Active sessions</h2>{sessions.isLoading ? <p>Loading sessions…</p> : sessions.isError ? <button onClick={() => sessions.refetch()}>Try again</button> : sessions.data?.map((session) => <article key={String(session.id)}><div><strong>{String(session.device_name ?? "Browser")}</strong><p>{String(session.ip_prefix ?? "Location unavailable")} · Last used {new Date(String(session.last_used_at)).toLocaleString()}</p></div><button onClick={() => revokeSession.mutate(String(session.id))}>Sign out session</button></article>)}</section>
    <section><h2>Passkeys</h2><p>Your device may use fingerprint, Face ID, Windows Hello, or its PIN. Dayflow never receives your biometric data.</p>{passkeys.data?.map((passkey) => <article key={String(passkey.credential_id)}><div><strong>{String(passkey.device_name ?? "Passkey")}</strong><p>Last used {passkey.last_used ? new Date(String(passkey.last_used)).toLocaleString() : "never"}</p></div><button onClick={() => removePasskey.mutate(String(passkey.credential_id))}>Remove passkey</button></article>)}<button onClick={() => enroll.mutate()} disabled={enroll.isPending}>{enroll.isPending ? "Waiting for this device…" : "Add a new passkey"}</button>{message && <p role="status">{message}</p>}</section>
  </main>
}

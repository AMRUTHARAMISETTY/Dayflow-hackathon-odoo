import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { API_URL, BackendUnavailableError, api, setAccessToken } from "./api"
import { DEMO_EMPLOYEE } from "./mockData"

export type UserRole = "ADMIN_HR" | "EMPLOYEE"
export interface AuthUser { id: string; employeeId?: string; email: string; displayName: string; roles: UserRole[]; name: string }
interface LoginResult { accessToken: string | null; expiresIn: number; user: Omit<AuthUser, "name">; additionalVerificationRequired: boolean }
interface AuthContextValue {
  user: AuthUser | null; loading: boolean
  signIn: (identifier: string, password: string, rememberDevice: boolean, portal: UserRole) => Promise<{ mfa: boolean; identifier: string; user: AuthUser }>
  signInWithPasskey: () => Promise<AuthUser>
  verifyAdminOtp: (identifier: string, code: string) => Promise<void>; signOut: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)
const normalize = (user: Omit<AuthUser, "name">): AuthUser => ({ ...user, name: user.displayName })

// Demo fallback: the real backend (see backend/) isn't always running in
// this environment. If it's genuinely unreachable (not just rejecting the
// request), the seeded demo employee can still sign in locally so the
// Employee portal stays demoable. This never masks a real credential
// rejection from a backend that IS up — only a connection failure.
const FALLBACK_SESSION_KEY = "dayflow_fallback_session"
const fallbackUser = (): AuthUser => ({
  id: DEMO_EMPLOYEE.id,
  employeeId: DEMO_EMPLOYEE.employeeId,
  email: DEMO_EMPLOYEE.email,
  displayName: DEMO_EMPLOYEE.name,
  roles: ["EMPLOYEE"],
  name: DEMO_EMPLOYEE.name,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api<LoginResult>("/api/auth/refresh", { method: "POST" }, false)
      .then((r) => { setAccessToken(r.accessToken); setUser(normalize(r.user)) })
      .catch((error) => {
        if (error instanceof BackendUnavailableError && localStorage.getItem(FALLBACK_SESSION_KEY)) {
          setUser(fallbackUser())
        } else {
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])
  async function signIn(identifier: string, password: string, rememberDevice: boolean, portal: UserRole) {
    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
    try {
      const result = await api<LoginResult>("/api/auth/login", { method: "POST", body: JSON.stringify({ identifier, password, rememberDevice, deviceName: platform ?? navigator.platform ?? "Browser" }) }, false)
      const current = normalize(result.user)
      if (!current.roles.includes(portal)) throw new Error("This account does not have permission to access the selected portal.")
      if (result.additionalVerificationRequired) return { mfa: true, identifier, user: current }
      setAccessToken(result.accessToken); setUser(current); return { mfa: false, identifier, user: current }
    } catch (error) {
      if (!(error instanceof BackendUnavailableError)) throw error
      if (portal !== "EMPLOYEE" || identifier.trim().toLowerCase() !== DEMO_EMPLOYEE.email.toLowerCase() || password !== DEMO_EMPLOYEE.password) {
        throw new Error("Dayflow's server can't be reached right now, and those aren't the demo credentials.")
      }
      localStorage.setItem(FALLBACK_SESSION_KEY, "1")
      const current = fallbackUser()
      setUser(current)
      return { mfa: false, identifier, user: current }
    }
  }
  async function verifyAdminOtp(identifier: string, code: string) { const result = await api<LoginResult>("/api/auth/email/verify-otp", { method: "POST", body: JSON.stringify({ identifier, code, purpose: "ADMIN_LOGIN" }) }, false); setAccessToken(result.accessToken); setUser(normalize(result.user)) }
  async function signInWithPasskey() {
    if (!window.PublicKeyCredential) throw new Error("Passkeys are not supported in this browser. Use your password instead.")
    try {
      const csrf = await api<{ token: string; headerName: string }>("/api/auth/csrf", {}, false)
      const optionResponse = await fetch(`${API_URL}/webauthn/authenticate/options`, { method: "POST", credentials: "include", headers: { [csrf.headerName]: csrf.token } })
      if (!optionResponse.ok) throw new Error("Passkey sign-in could not start. Use your password instead.")
      const options = await optionResponse.json()
      options.challenge = fromBase64Url(options.challenge)
      options.allowCredentials = (options.allowCredentials ?? []).map((item: { id: string }) => ({ ...item, id: fromBase64Url(item.id) }))
      const credential = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential | null
      if (!credential) throw new Error("Biometric sign-in was cancelled. Use your password instead.")
      const assertion = credential.response as AuthenticatorAssertionResponse
      const verification = await fetch(`${API_URL}/login/webauthn`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token }, body: JSON.stringify({ id: credential.id, rawId: toBase64Url(credential.rawId), type: credential.type, response: { authenticatorData: toBase64Url(assertion.authenticatorData), clientDataJSON: toBase64Url(assertion.clientDataJSON), signature: toBase64Url(assertion.signature), userHandle: assertion.userHandle ? toBase64Url(assertion.userHandle) : null }, clientExtensionResults: credential.getClientExtensionResults(), authenticatorAttachment: credential.authenticatorAttachment }) })
      if (!verification.ok) throw new Error("This passkey could not be verified. Use your password and register this device again.")
      const result = await verification.json() as LoginResult
      setAccessToken(result.accessToken); const current = normalize(result.user); setUser(current); return current
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") throw new Error("No usable passkey was selected. Sign in with your password, then open Security and add this device as a passkey.")
      if (error instanceof DOMException && error.name === "InvalidStateError") throw new Error("This device is already registered. Try biometric sign-in again or remove and re-add the passkey from Security.")
      if (error instanceof DOMException) throw new Error("Biometric sign-in could not be completed. Use your password instead.")
      throw error
    }
  }
  async function signOut() { localStorage.removeItem(FALLBACK_SESSION_KEY); await api<void>("/api/auth/logout", { method: "POST" }).catch(() => {}); setAccessToken(null); setUser(null) }
  return <AuthContext.Provider value={{ user, loading, signIn, signInWithPasskey, verifyAdminOtp, signOut }}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used within AuthProvider"); return value }
function fromBase64Url(value: string) { const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer }
function toBase64Url(value: ArrayBuffer) { let binary = ""; new Uint8Array(value).forEach((byte) => { binary += String.fromCharCode(byte) }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }

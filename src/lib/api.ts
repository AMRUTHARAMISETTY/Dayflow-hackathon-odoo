const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"
let accessToken: string | null = null
let refreshPromise: Promise<boolean> | null = null
let csrf: { token: string; headerName: string } | null = null

export function setAccessToken(token: string | null) { accessToken = token }

async function refresh() {
  if (!refreshPromise) refreshPromise = fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (response) => { if (!response.ok) return false; const data = await response.json(); setAccessToken(data.accessToken); return true })
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

// Thrown specifically when the backend can't be reached at all (connection
// refused, DNS failure, etc.) — distinct from the backend responding with a
// real error. Callers use this to distinguish "server is down" from "server
// said no," e.g. to fall back to a local demo path only in the former case.
export class BackendUnavailableError extends Error {
  constructor() {
    super("Dayflow's server can't be reached.")
    this.name = "BackendUnavailableError"
  }
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers)
  const method = (init.method ?? "GET").toUpperCase()
  let response: Response
  try {
    if (accessToken && !["GET", "HEAD", "OPTIONS"].includes(method) && path !== "/api/auth/refresh") {
      if (!csrf) csrf = await fetch(`${API_URL}/api/auth/csrf`, { credentials: "include" }).then((r) => r.json())
      headers.set(csrf!.headerName, csrf!.token)
    }
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
    response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" })
  } catch {
    throw new BackendUnavailableError()
  }
  if (response.status === 401 && retry && await refresh()) return api<T>(path, init, false)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? (response.status >= 500 ? "Dayflow is temporarily unavailable." : "The request could not be completed."))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export { API_URL }

export async function registerPasskey(label: string) {
  if (!window.PublicKeyCredential) throw new Error("Passkeys are not supported in this browser.")
  const options = await api<Record<string, any>>("/api/auth/passkeys/register/options", { method: "POST" })
  options.challenge = decode(options.challenge)
  options.user.id = decode(options.user.id)
  options.excludeCredentials = (options.excludeCredentials ?? []).map((item: { id: string }) => ({ ...item, id: decode(item.id) }))
  const credential = await navigator.credentials.create({ publicKey: options as PublicKeyCredentialCreationOptions }) as PublicKeyCredential | null
  if (!credential) throw new Error("Passkey setup was cancelled.")
  const attestation = credential.response as AuthenticatorAttestationResponse
  return api("/api/auth/passkeys/register/verify", { method: "POST", body: JSON.stringify({ publicKey: { label, credential: { id: credential.id, rawId: encode(credential.rawId), type: credential.type, response: { attestationObject: encode(attestation.attestationObject), clientDataJSON: encode(attestation.clientDataJSON), transports: attestation.getTransports?.() ?? [] }, clientExtensionResults: credential.getClientExtensionResults(), authenticatorAttachment: credential.authenticatorAttachment } } }) })
}

function decode(value: string) { const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer }
function encode(value: ArrayBuffer) { let binary = ""; new Uint8Array(value).forEach((byte) => { binary += String.fromCharCode(byte) }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }

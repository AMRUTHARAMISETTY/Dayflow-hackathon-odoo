import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Laptop, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import {
  deletePasskey, fetchAuthSessions, fetchPasskeys, fetchSecurityEvents, passkeyRegisterOptions,
  passkeyRegisterVerify, revokeAuthSession
} from "../lib/api";
import type { AuthSession, PasskeyView, SecurityEvent } from "../lib/types";
import { useToast } from "../lib/toast-context";

function bytesFromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function base64UrlFromBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function userIdBytes(value: unknown) {
  if (typeof value !== "string") return new Uint8Array([1]);
  return bytesFromBase64Url(value);
}

export function SecurityDevicesPage() {
  const notify = useToast();
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyView[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [nextSessions, nextPasskeys, nextEvents] = await Promise.all([fetchAuthSessions(), fetchPasskeys(), fetchSecurityEvents()]);
      setSessions(nextSessions);
      setPasskeys(nextPasskeys);
      setEvents(nextEvents);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Could not load security settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const enrollPasskey = async () => {
    setBusy(true);
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error("This browser or device does not support passkeys.");
      }
      const deviceName = window.prompt("Name this passkey device", navigator.platform || "This device") ?? "This device";
      const options = await passkeyRegisterOptions();
      const publicKey = options.publicKey as {
        challenge: string;
        rp: PublicKeyCredentialRpEntity;
        user: { id: string; name: string; displayName: string };
        pubKeyCredParams: PublicKeyCredentialParameters[];
        timeout: number;
        attestation: AttestationConveyancePreference;
        authenticatorSelection: AuthenticatorSelectionCriteria;
      };
      const credential = await navigator.credentials.create({
        publicKey: {
          ...publicKey,
          challenge: bytesFromBase64Url(publicKey.challenge),
          user: { ...publicKey.user, id: userIdBytes(publicKey.user.id) }
        }
      }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey setup was cancelled.");
      await passkeyRegisterVerify({
        challenge: options.challenge,
        credentialId: credential.id,
        publicKey: base64UrlFromBuffer(credential.rawId),
        deviceName,
        transports: (credential.response as AuthenticatorAttestationResponse).getTransports?.() ?? []
      });
      notify("success", "Passkey registered. Your biometric data stayed on this device.");
      await load();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Passkey enrollment failed.");
    } finally {
      setBusy(false);
    }
  };

  const removePasskey = async (credentialId: string) => {
    if (!window.confirm("Remove this passkey from Dayflow?")) return;
    await deletePasskey(credentialId);
    notify("success", "Passkey removed.");
    await load();
  };

  const removeSession = async (sessionId: number) => {
    if (!window.confirm("Sign out this session?")) return;
    await revokeAuthSession(sessionId);
    notify("success", "Session revoked.");
    await load();
  };

  return (
    <div className="stack">
      <div className="page-header-row">
        <div>
          <p className="eyebrow"><ShieldAlert size={15} /> Security center</p>
          <h2>Security and Devices</h2>
          <p className="muted">Manage sessions, registered passkeys, and recent account security activity.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
          <button className="primary" onClick={enrollPasskey} disabled={busy}><Fingerprint size={16} /> Add passkey</button>
        </div>
      </div>

      <div className="security-grid">
        <section className="panel">
          <h3><KeyRound size={18} /> Passkeys</h3>
          <p className="muted">Fingerprint, Face ID, Windows Hello, and device PIN are handled by your OS. Dayflow stores only public credential data.</p>
          {passkeys.length === 0 ? <p className="empty-inline">No passkeys registered yet.</p> : passkeys.map((key) => (
            <div className="security-row" key={key.credentialId}>
              <div><strong>{key.deviceName}</strong><span>Created {new Date(key.createdAt).toLocaleString()}</span></div>
              <button className="icon-button" aria-label="Remove passkey" onClick={() => removePasskey(key.credentialId)}><Trash2 size={16} /></button>
            </div>
          ))}
        </section>

        <section className="panel">
          <h3><Laptop size={18} /> Active sessions</h3>
          {sessions.length === 0 ? <p className="empty-inline">No active sessions found.</p> : sessions.map((session) => (
            <div className="security-row" key={session.id}>
              <div>
                <strong>{session.current ? "Current session" : session.deviceName ?? "Dayflow session"}</strong>
                <span>{session.createdIp ?? "Unknown IP"} - expires {new Date(session.expiresAt).toLocaleString()}</span>
              </div>
              {!session.current && <button className="icon-button" aria-label="Revoke session" onClick={() => removeSession(session.id)}><Trash2 size={16} /></button>}
            </div>
          ))}
        </section>
      </div>

      <section className="panel">
        <h3><ShieldAlert size={18} /> Security activity</h3>
        {events.length === 0 ? <p className="empty-inline">No security activity yet.</p> : events.map((event) => (
          <div className="security-row" key={event.id}>
            <div>
              <strong>{event.eventType.replace(/_/g, " ")}</strong>
              <span>{event.detail}</span>
            </div>
            <span className={`severity-pill ${event.severity.toLowerCase()}`}>{new Date(event.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

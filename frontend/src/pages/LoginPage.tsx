import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Fingerprint, LifeBuoy, LockKeyhole, Mail, Moon, ShieldCheck, Sun, UserRoundCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, login, passkeyLoginOptions, passkeyLoginVerify, requestEmployeeActivation } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";

type Mode = "login" | "activate" | "forgot";

function bytesFromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function LoginPage() {
  const { setUser } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("admin@dayflow.test");
  const [password, setPassword] = useState("Dayflow@123");
  const [employeeId, setEmployeeId] = useState("DF-00005");
  const [activationEmail, setActivationEmail] = useState("employee@dayflow.test");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("dayflow.theme", next ? "dark" : "light");
  };

  const redirectFor = () => navigate("/", { replace: true });

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(identifier, password, rememberDevice);
      setUser(user);
      notify("success", `Welcome back, ${user.name.split(" ")[0]}.`);
      redirectFor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The provided credentials could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  const submitActivation = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await requestEmployeeActivation(employeeId, activationEmail);
      notify("success", response.message);
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation could not be started.");
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await forgotPassword(identifier);
      notify("success", response.message);
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password recovery could not be started.");
    } finally {
      setLoading(false);
    }
  };

  const signInWithPasskey = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error("This browser or device does not support passkeys.");
      }
      const options = await passkeyLoginOptions(identifier);
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: bytesFromBase64Url(options.challenge),
          timeout: 60000,
          userVerification: "required"
        }
      }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Biometric sign-in was cancelled.");
      const user = await passkeyLoginVerify(options.challenge, credential.id);
      setUser(user);
      notify("success", "Signed in with passkey.");
      redirectFor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-split">
      <section className="login-story">
        <div className="login-orb one" />
        <div className="login-orb two" />
        <div className="login-brand">
          <div className="brand-mark">D</div>
          <div>
            <strong>Dayflow</strong>
            <span>Every workday, perfectly aligned.</span>
          </div>
        </div>
        <div className="workplace-illustration" aria-hidden="true">
          <div className="illustration-header" />
          <div className="illustration-grid"><span /><span /><span /><span /></div>
          <div className="illustration-people"><i /><i /><i /></div>
        </div>
        <div className="benefit-list">
          {["Simplified attendance", "Faster leave approvals", "Secure employee records", "Smarter HR operations"].map((benefit) => (
            <span key={benefit}><ShieldCheck size={16} />{benefit}</span>
          ))}
        </div>
      </section>

      <section className="login-form-wrap">
        <div className="mobile-login-brand">
          <div className="brand-mark">D</div>
          <div><strong>Dayflow</strong><span>Every workday, perfectly aligned.</span></div>
        </div>
        <div className="auth-panel enterprise">
          <button className="icon-button theme-float" onClick={setTheme} aria-label="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <p className="eyebrow"><LockKeyhole size={15} /> Secure workspace</p>
          <h1>{mode === "login" ? "Welcome back" : mode === "activate" ? "Activate employee account" : "Recover password"}</h1>
          <p className="tagline">
            {mode === "login" ? "Sign in securely to your Dayflow workspace." :
              mode === "activate" ? "Use your Employee ID and company email to start activation." :
              "Enter your company email or Employee ID. We will send the next step if the account is valid."}
          </p>

          {mode === "login" && (
            <form onSubmit={submitLogin}>
              <label className="field">
                Company email or Employee ID
                <span className="input-with-icon"><Mail size={16} /><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete="username" /></span>
              </label>
              <label className="field">
                Password
                <span className="input-with-icon">
                  <LockKeyhole size={16} />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
                  <button type="button" className="inline-icon" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide secret" : "Show secret"}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              <div className="login-row">
                <label className="check-row"><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} /> Remember this device</label>
                <button type="button" className="link" onClick={() => setMode("forgot")}>Forgot password?</button>
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
              <button type="button" className="secondary biometric-button" disabled={loading} onClick={signInWithPasskey}>
                <Fingerprint size={18} /> Use fingerprint or Face ID
              </button>
              <p className="biometric-note">Your biometric information remains securely on this device.</p>
            </form>
          )}

          {mode === "activate" && (
            <form onSubmit={submitActivation}>
              <label className="field">Employee ID<input value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required /></label>
              <label className="field">Company email<input type="email" value={activationEmail} onChange={(event) => setActivationEmail(event.target.value)} required /></label>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" disabled={loading}>{loading ? "Sending..." : "Send activation email"}</button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={submitForgot}>
              <label className="field">Company email or Employee ID<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" disabled={loading}>{loading ? "Sending..." : "Send recovery link"}</button>
            </form>
          )}

          <div className="auth-actions">
            <button className="link" onClick={() => setMode(mode === "activate" ? "login" : "activate")}><UserRoundCheck size={15} /> {mode === "activate" ? "Back to sign in" : "Activate employee account"}</button>
            <Link className="link" to="/register">Employee self sign-up</Link>
            <button className="link" onClick={() => notify("info", "Contact your Dayflow workspace administrator for account support.")}><LifeBuoy size={15} /> Help and support</button>
          </div>
          <div className="auth-hint">
            Admin/HR access is granted only by invitation or secure setup. Dayflow determines your role after authentication.
          </div>
        </div>
      </section>
    </main>
  );
}

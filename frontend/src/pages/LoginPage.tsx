import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";

export function LoginPage() {
  const { setUser } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@dayflow.test");
  const [password, setPassword] = useState("Dayflow@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      setUser(user);
      notify("success", `Welcome back, ${user.name.split(" ")[0]}.`);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-mark">D</div>
        <h1>Dayflow</h1>
        <p className="tagline">Every workday, perfectly aligned.</p>
        <form onSubmit={submit}>
          <label className="field">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
          </label>
          <label className="field">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="switch-link">New employee? <Link to="/register">Create an account</Link></p>
        <div className="auth-hint">
          HR, Manager, Payroll and Auditor access is granted only by invitation — public sign-up always creates a standard Employee account.
        </div>
      </section>
    </main>
  );
}

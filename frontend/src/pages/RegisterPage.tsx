import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";

export function RegisterPage() {
  const { setUser } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await register(name, email, password);
      setUser(user);
      notify("success", "Account created. HR will complete your profile before onboarding tasks are assigned.");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-mark">D</div>
        <h1>Create your account</h1>
        <p className="tagline">This always creates a standard Employee account.</p>
        <form onSubmit={submit}>
          <label className="field">
            Full name
            <input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
          </label>
          <label className="field">
            Work email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
          </label>
          <label className="field">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="switch-link">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}

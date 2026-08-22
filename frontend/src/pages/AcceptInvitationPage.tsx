import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvitation, lookupInvitation } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, LoadingSkeleton } from "../components/StateViews";

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { setUser } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();

  const [lookupState, setLookupState] = useState<"loading" | "valid" | "invalid">("loading");
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLookupState("invalid");
      return;
    }
    lookupInvitation(token)
      .then((result) => {
        if (result.expired) {
          setLookupState("invalid");
        } else {
          setEmail(result.email);
          setRoleName(result.roleName);
          setLookupState("valid");
        }
      })
      .catch(() => setLookupState("invalid"));
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await acceptInvitation(token, name, password);
      setUser(user);
      notify("success", "Invitation accepted. Welcome to Dayflow.");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept this invitation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand-mark">D</div>
        <h1>Accept invitation</h1>
        {lookupState === "loading" && <LoadingSkeleton rows={3} />}
        {lookupState === "invalid" && (
          <EmptyState title="This invitation link is invalid or has expired" description="Ask whoever invited you to send a new one." action={<Link to="/login" className="link">Back to sign in</Link>} />
        )}
        {lookupState === "valid" && (
          <>
            <p className="tagline">{email} — {roleName.replace(/_/g, " ")}</p>
            <form onSubmit={submit}>
              <label className="field">
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
              </label>
              <label className="field">
                Choose a password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="primary" disabled={loading}>{loading ? "Activating…" : "Activate account"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

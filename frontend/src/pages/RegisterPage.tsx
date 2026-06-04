import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await register(
        fd.get("email") as string,
        fd.get("password") as string,
        (fd.get("displayName") as string) || undefined
      );
      navigate("/practice");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card card">
        <h1>Create account</h1>
        <p className="muted">Free account — save adaptive practice progress and NEET marks.</p>
        <form onSubmit={onSubmit} className="auth-form">
          <label>
            Display name
            <input name="displayName" type="text" autoComplete="name" placeholder="Optional" />
          </label>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input name="password" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn primary btn-block" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="auth-footer muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

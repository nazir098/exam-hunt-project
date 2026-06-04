import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { sessionIdleMinutes } from "../auth/session";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await login(fd.get("email") as string, fd.get("password") as string);
      const next = searchParams.get("next") || "/practice";
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card card">
        <h1>Sign in</h1>
        <p className="muted">
          Track marks, progress, and ratings. You stay signed in until you log out or{" "}
          {sessionIdleMinutes()} minutes of inactivity.
        </p>
        <form onSubmit={onSubmit} className="auth-form">
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input name="password" type="password" required minLength={6} autoComplete="current-password" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn primary btn-block" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-footer muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </main>
  );
}

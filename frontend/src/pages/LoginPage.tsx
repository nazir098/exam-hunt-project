import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND_NAME } from "../design/stitchAssets";
import { useAuth } from "../auth/AuthContext";
import { useAuthRedirect } from "../auth/useAuthRedirect";
import { sessionIdleMinutes } from "../auth/session";
import AuthGoogleSection from "../components/AuthGoogleSection";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const redirectAfterAuth = useAuthRedirect();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const profile = await login(fd.get("email") as string, fd.get("password") as string);
      redirectAfterAuth(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleCredential(credential: string) {
    setError("");
    setBusy(true);
    try {
      const profile = await loginWithGoogle(credential);
      redirectAfterAuth(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card glass-card">
        <div className="auth-card__icon" aria-hidden>
          <span className="material-symbols-outlined">login</span>
        </div>
        <h1 className="auth-card__title">Sign in</h1>
        <p className="auth-card__desc">
          Track marks, progress, and ratings. You stay signed in until you log out or{" "}
          {sessionIdleMinutes()} minutes of inactivity.
        </p>

        <AuthGoogleSection
          disabled={busy}
          onCredential={(credential) => void onGoogleCredential(credential)}
          onError={setError}
        />

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span className="auth-field__label">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="auth-field__input"
              placeholder="you@example.com"
            />
          </label>
          <label className="auth-field">
            <span className="auth-field__label">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="auth-field__input"
              placeholder="••••••••"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit electric-glow-bg" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-card__footer">
          New here?{" "}
          <Link to="/register" className="auth-link">
            Create an account
          </Link>
        </p>
        <p className="auth-card__brand-muted">
          <Link to="/" className="auth-link auth-link--subtle">
            ← Back to {BRAND_NAME}
          </Link>
        </p>
      </div>
    </main>
  );
}

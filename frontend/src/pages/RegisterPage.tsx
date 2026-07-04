import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND_NAME } from "../design/stitchAssets";
import { useAuth } from "../auth/AuthContext";
import { useAuthRedirect } from "../auth/useAuthRedirect";
import AuthGoogleSection from "../components/AuthGoogleSection";
import SiteLegalLinks from "../components/SiteLegalLinks";

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const redirectAfterAuth = useAuthRedirect();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const profile = await register(
        fd.get("email") as string,
        fd.get("password") as string,
        (fd.get("displayName") as string) || undefined
      );
      redirectAfterAuth(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
          <span className="material-symbols-outlined">person_add</span>
        </div>
        <h1 className="auth-card__title">Create account</h1>
        <p className="auth-card__desc">
          Free account — save adaptive practice progress, NEET marks, and leaderboard rank.
        </p>

        <AuthGoogleSection
          label="signup"
          disabled={busy}
          onCredential={(credential) => void onGoogleCredential(credential)}
          onError={setError}
        />

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span className="auth-field__label">Display name</span>
            <input
              name="displayName"
              type="text"
              autoComplete="name"
              className="auth-field__input"
              placeholder="Optional"
            />
          </label>
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
              autoComplete="new-password"
              className="auth-field__input"
              placeholder="At least 8 characters"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit electric-glow-bg" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
        <p className="auth-card__brand-muted">
          <Link to="/" className="auth-link auth-link--subtle">
            ← Back to {BRAND_NAME}
          </Link>
        </p>
        <SiteLegalLinks className="auth-card__legal" />
      </div>
    </main>
  );
}

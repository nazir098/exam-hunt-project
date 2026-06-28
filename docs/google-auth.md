# Google Sign-In (feature flag)

Google sign-in is **implemented but off by default**. Email + password continues to work unchanged.

## Enable locally

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**
2. Create **OAuth 2.0 Client ID** → Application type: **Web application**
3. **Authorized JavaScript origins:**
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - `https://www.techmuzzle.in`
   - `https://exam-hunt-project.pages.dev`
4. No redirect URI needed (uses Google Identity Services one-tap / button with ID token).

Add to project root `.env`:

```env
GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
# Optional: show the button even if /api/auth/google/status is slow or missing (Pages builds)
VITE_GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

Restart the backend (`scripts/dev-api.sh`). Restart Vite if you add `VITE_*` vars. The login and register pages show **Continue with Google** when `/api/auth/google/status` returns `enabled: true` (or when `VITE_GOOGLE_CLIENT_ID` is set).

Optional frontend-only hide:

```env
VITE_GOOGLE_AUTH_ENABLED=false
```

## Production (EC2 `.env`)

```env
GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=<same-web-client-id>
```

Redeploy/restart API (Watchtower + `docker compose up -d api`). Verify:

```bash
curl https://api.techmuzzle.in/api/auth/google/status
```

Redeploy Cloudflare Pages if you use `VITE_*` overrides.

## Behaviour

- New users: account created from Google email + name (no password).
- Existing email/password user: first Google login **links** the Google account to the same email.
- Admin email: must use **password sign-in** (Google registration blocked for admin email).
- Same app JWT as email login — practice sessions work identically.

## Later: phone OTP

Phone verification can be added alongside Google and email. Keep `GOOGLE_AUTH_ENABLED` independent of a future `PHONE_AUTH_ENABLED` flag.

## Cost

Google Sign-In is **free** for normal OAuth volumes.

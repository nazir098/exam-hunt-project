import { useEffect, useRef, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { fetchGoogleAuthStatus } from "../api";

type Props = {
  label?: string;
  disabled?: boolean;
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
};

type GoogleStatus = {
  enabled: boolean;
  clientId: string;
};

const ENV_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

function GoogleGIcon() {
  return (
    <svg className="auth-google__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GoogleSignInControl({
  label,
  disabled,
  onCredential,
  onError,
}: Omit<Props, never>) {
  const controlRef = useRef<HTMLDivElement>(null);
  const [btnWidth, setBtnWidth] = useState(320);
  const labelText = label === "signup" ? "Sign up with Google" : "Continue with Google";

  useEffect(() => {
    const el = controlRef.current;
    if (!el) return;
    const syncWidth = () => {
      setBtnWidth(Math.max(200, Math.floor(el.clientWidth)));
    };
    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={controlRef} className="auth-google__control">
      <div className="auth-google__btn auth-google__btn--visual" aria-hidden>
        <GoogleGIcon />
        <span>{labelText}</span>
      </div>
      <div className={disabled ? "auth-google__gsi-overlay auth-google__gsi-overlay--disabled" : "auth-google__gsi-overlay"}>
        <GoogleLogin
          text={label === "signup" ? "signup_with" : "continue_with"}
          theme="filled_black"
          size="large"
          width={btnWidth}
          onSuccess={(res) => {
            if (!res.credential) {
              onError("Google sign-in did not return a credential");
              return;
            }
            onCredential(res.credential);
          }}
          onError={() => onError("Google sign-in was cancelled or failed")}
        />
      </div>
    </div>
  );
}

function resolveGoogleStatus(status: GoogleStatus | null): GoogleStatus | null {
  const viteOff = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "false";
  if (viteOff) return null;

  const clientId = (status?.clientId || ENV_CLIENT_ID).trim();
  if (!clientId) return null;

  const enabled = status?.enabled ?? Boolean(ENV_CLIENT_ID);
  if (!enabled) return null;

  return { enabled: true, clientId };
}

export default function AuthGoogleSection(props: Props) {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGoogleAuthStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled && ENV_CLIENT_ID) {
          setStatus({ enabled: true, clientId: ENV_CLIENT_ID });
        } else if (!cancelled) {
          setStatus({ enabled: false, clientId: "" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved = resolveGoogleStatus(status);

  if (loading && !ENV_CLIENT_ID) {
    return (
      <div className="auth-google auth-google--loading" aria-hidden>
        <div className="auth-google__btn auth-google__btn--placeholder" />
      </div>
    );
  }

  if (!resolved) {
    return null;
  }

  return (
    <div className="auth-google">
      <GoogleOAuthProvider clientId={resolved.clientId}>
        <div className={props.disabled ? "auth-google__wrap auth-google__wrap--disabled" : "auth-google__wrap"}>
          <GoogleSignInControl {...props} />
        </div>
      </GoogleOAuthProvider>
      <div className="auth-google__divider" aria-hidden>
        <span>or</span>
      </div>
    </div>
  );
}

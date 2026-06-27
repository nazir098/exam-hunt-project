import { useEffect, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { fetchGoogleAuthStatus } from "../api";

type Props = {
  label?: string;
  disabled?: boolean;
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
};

export default function AuthGoogleSection({ label, disabled, onCredential, onError }: Props) {
  const [status, setStatus] = useState<{ enabled: boolean; clientId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGoogleAuthStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ enabled: false, clientId: "" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const viteOff = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "false";
  if (viteOff || !status?.enabled || !status.clientId) {
    return null;
  }

  return (
    <div className="auth-google">
      <div className="auth-google__divider" aria-hidden>
        <span>or</span>
      </div>
      <GoogleOAuthProvider clientId={status.clientId}>
        <div className={`auth-google__button${disabled ? " auth-google__button--disabled" : ""}`}>
          <GoogleLogin
            text={label === "signup" ? "signup_with" : "continue_with"}
            shape="rectangular"
            theme="outline"
            size="large"
            width="100%"
            onSuccess={(res) => {
              if (disabled) return;
              if (!res.credential) {
                onError("Google sign-in did not return a credential");
                return;
              }
              onCredential(res.credential);
            }}
            onError={() => onError("Google sign-in was cancelled or failed")}
          />
        </div>
      </GoogleOAuthProvider>
    </div>
  );
}

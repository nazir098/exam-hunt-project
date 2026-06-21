import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMe,
  fetchProgress,
  login as apiLogin,
  register as apiRegister,
  type ProgressSummary,
  type UserProfile,
} from "../api";
import { isSessionIdleExpired, touchSessionActivity } from "./session";
import { clearToken, getToken, setToken } from "./storage";
import { setAnalyticsUser, trackEvent } from "../analytics";

type AuthContextValue = {
  user: UserProfile | null;
  progress: ProgressSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  touchActivity: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const progressInflightRef = useRef<Promise<void> | null>(null);

  const logout = useCallback(() => {
    trackEvent("logout");
    clearToken();
    setUser(null);
    setProgress(null);
    setAnalyticsUser(null);
  }, []);

  const refreshProgress = useCallback(async () => {
    if (!getToken()) {
      setProgress(null);
      return;
    }
    if (progressInflightRef.current) {
      await progressInflightRef.current;
      return;
    }
    const job = (async () => {
      try {
        setProgress(await fetchProgress());
      } catch {
        setProgress(null);
      }
    })();
    progressInflightRef.current = job;
    try {
      await job;
    } finally {
      progressInflightRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setProgress(null);
      return;
    }
    if (isSessionIdleExpired()) {
      logout();
      return;
    }
    touchSessionActivity();
    try {
      const me = await fetchMe();
      setUser(me);
      setAnalyticsUser(me.id);
      void refreshProgress();
    } catch {
      logout();
    }
  }, [logout, refreshProgress]);

  const touchActivity = useCallback(() => {
    if (!getToken()) return;
    touchSessionActivity();
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    function onActivity() {
      touchSessionActivity();
    }
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      if (isSessionIdleExpired()) {
        logout();
      }
    }, 60_000);

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
      window.clearInterval(interval);
    };
  }, [user, logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      setToken(res.token);
      setUser(res.user);
      setAnalyticsUser(res.user.id);
      touchSessionActivity();
      trackEvent("login");
      await refreshProgress();
      return res.user;
    },
    [refreshProgress]
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await apiRegister(email, password, displayName);
      setToken(res.token);
      setUser(res.user);
      setAnalyticsUser(res.user.id);
      touchSessionActivity();
      trackEvent("sign_up");
      await refreshProgress();
    },
    [refreshProgress]
  );

  const value = useMemo(
    () => ({
      user,
      progress,
      loading,
      login,
      register,
      logout,
      refresh,
      refreshProgress,
      touchActivity,
    }),
    [user, progress, loading, login, register, logout, refresh, refreshProgress, touchActivity]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setProgress(null);
  }, []);

  const refreshProgress = useCallback(async () => {
    if (!getToken()) {
      setProgress(null);
      return;
    }
    try {
      setProgress(await fetchProgress());
    } catch {
      setProgress(null);
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
      setUser(await fetchMe());
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
      touchSessionActivity();
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
      touchSessionActivity();
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


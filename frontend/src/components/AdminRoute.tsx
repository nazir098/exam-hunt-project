import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Props = {
  children: ReactNode;
};

/**
 * Guards /admin/* routes. Predictable question URLs are fine — only signed-in admins
 * can load data; all writes go through /api/admin/** (ROLE_ADMIN on the server).
 */
export default function AdminRoute({ children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="stitch-page admin-page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!user.admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

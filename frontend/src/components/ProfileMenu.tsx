import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Props = {
  variant?: "desktop" | "mobile";
};

export default function ProfileMenu({ variant = "desktop" }: Props) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = variant === "mobile";

  useLayoutEffect(() => {
    if (!open || !isMobile || !rootRef.current) return;
    function place() {
      const trigger = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
        left: "auto",
        width: "min(18rem, calc(100vw - 1.5rem))",
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.email).charAt(0).toUpperCase();

  return (
    <div
      className={`profile-menu${isMobile ? " profile-menu--mobile" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`profile-menu__trigger stitch-desktop-avatar${isMobile ? " profile-menu__trigger--mobile" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        title={user.displayName || user.email}
      >
        {initial}
      </button>
      {open && (
        <div
          className="profile-menu__dropdown glass-card"
          role="menu"
          style={isMobile ? dropdownStyle : undefined}
        >
          <div className="profile-menu__identity">
            <strong>{user.displayName || "Student"}</strong>
            <span>{user.email}</span>
          </div>
          <Link to="/revision" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined">bookmark</span>
            Revision list
          </Link>
          <Link to="/analytics" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined">insights</span>
            Analytics &amp; progress
          </Link>
          <Link to="/leaderboard" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined">emoji_events</span>
            Leaderboard
          </Link>
          {user.admin && (
            <Link to="/admin" className="profile-menu__item" role="menuitem" onClick={() => setOpen(false)}>
              <span className="material-symbols-outlined">admin_panel_settings</span>
              Admin tools
            </Link>
          )}
          <button type="button" className="profile-menu__item profile-menu__item--danger" role="menuitem" onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

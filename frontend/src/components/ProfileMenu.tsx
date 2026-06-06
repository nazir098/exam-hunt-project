import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="profile-menu__trigger stitch-desktop-avatar"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={user.displayName || user.email}
      >
        {initial}
      </button>
      {open && (
        <div className="profile-menu__dropdown glass-card" role="menu">
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

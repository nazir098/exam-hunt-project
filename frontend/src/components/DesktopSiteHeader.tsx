import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { BRAND_NAME } from "../design/stitchAssets";
import { SITE_NAV } from "../navigation/siteNav";
import UserProgressPanel from "./UserProgressPanel";

type Props = {
  /** Hide main nav links (e.g. focused practice question). */
  minimal?: boolean;
};

export default function DesktopSiteHeader({ minimal = false }: Props) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const profileTo = user ? "/analytics" : "/login";

  return (
    <header className="stitch-desktop-header hidden lg:flex" role="banner">
      <div className="stitch-desktop-header__inner">
        <Link to="/" className="stitch-logo shrink-0">
          {BRAND_NAME}
        </Link>

        {!minimal && (
          <nav className="stitch-desktop-nav" aria-label="Main">
            {SITE_NAV.map((item) =>
              item.disabled ? (
                <span key={item.label} className="stitch-desktop-nav__link stitch-desktop-nav__link--disabled">
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  data-tooltip={item.hint || undefined}
                  className={
                    (item.match(pathname)
                      ? "stitch-desktop-nav__link stitch-desktop-nav__link--active"
                      : "stitch-desktop-nav__link") + (item.hint ? " nav-tip" : "")
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </Link>
              )
            )}
          </nav>
        )}

        <div className="stitch-desktop-header__actions">
          {user && <UserProgressPanel variant="inline" />}
          <button
            type="button"
            className="stitch-desktop-icon-btn"
            title="AI assistant (coming soon)"
            disabled
          >
            <span className="material-symbols-outlined">smart_toy</span>
          </button>
          {user ? (
            <Link to={profileTo} className="stitch-desktop-avatar" title={user.displayName || user.email}>
              {(user.displayName || user.email).charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link to="/login" className="stitch-desktop-sign-in">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

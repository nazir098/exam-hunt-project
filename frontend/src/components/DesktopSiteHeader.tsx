import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GlobalSearch from "./GlobalSearch";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";
import { BRAND_NAME } from "../design/stitchAssets";
import { SITE_NAV } from "../navigation/siteNav";

type Props = {
  minimal?: boolean;
};

export default function DesktopSiteHeader({ minimal = false }: Props) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <header className="stitch-desktop-header hidden lg:flex" role="banner">
      <div className="stitch-desktop-header__inner">
        <div className="stitch-desktop-header__top">
          <div className="stitch-desktop-header__brand">
            <Link to="/" className="stitch-logo" title={BRAND_NAME}>
              {BRAND_NAME}
            </Link>
          </div>

          <div className="stitch-desktop-header__search">
            {!minimal && <GlobalSearch id="global-search-desktop" />}
          </div>

          <div className="stitch-desktop-header__actions">
            <ThemeToggle />
            {user ? (
              <ProfileMenu />
            ) : (
              <>
                <Link to="/login" className="stitch-desktop-sign-in stitch-desktop-sign-in--ghost">
                  Sign in
                </Link>
                <Link to="/register" className="stitch-desktop-sign-in">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>

        {!minimal && (
          <nav className="stitch-desktop-header__nav-row" aria-label="Main">
            {SITE_NAV.map((item) =>
              item.disabled ? (
                <span
                  key={item.label}
                  className="stitch-desktop-nav__link stitch-desktop-nav__link--disabled"
                  title={item.label}
                >
                  <span className="material-symbols-outlined stitch-desktop-nav__icon">{item.icon}</span>
                  <span className="stitch-desktop-nav__label">{item.label}</span>
                </span>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  data-tooltip={item.hint || undefined}
                  title={item.label}
                  className={
                    (item.match(pathname)
                      ? "stitch-desktop-nav__link stitch-desktop-nav__link--active"
                      : "stitch-desktop-nav__link") + (item.hint ? " nav-tip" : "")
                  }
                >
                  <span className="material-symbols-outlined stitch-desktop-nav__icon">{item.icon}</span>
                  <span className="stitch-desktop-nav__label">{item.label}</span>
                </Link>
              )
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

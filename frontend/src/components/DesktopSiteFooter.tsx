import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { BRAND_NAME, BRAND_WITH_OWNER } from "../design/stitchAssets";
import SiteLegalLinks from "./SiteLegalLinks";

export default function DesktopSiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="stitch-site-footer" role="contentinfo">
      <div className="stitch-desktop-footer__inner stitch-desktop-footer__inner--compact">
        <Link to="/" className="stitch-logo text-[20px]">
          {BRAND_NAME}
        </Link>
        <p className="text-caption text-on-surface-variant">{BRAND_WITH_OWNER}</p>
        <p className="stitch-desktop-footer__tagline text-body-sm text-on-surface-variant">
          {user
            ? "NEET question bank for study, Practice for tracked marks, and analytics for progress."
            : "Sign in from the header to save marks, streaks, and personalized analytics."}
        </p>
        <SiteLegalLinks className="stitch-site-footer__legal" />
      </div>
      <p className="stitch-desktop-footer__copy text-caption text-on-surface-variant">
        © {new Date().getFullYear()} {BRAND_WITH_OWNER}. All rights reserved.
      </p>
    </footer>
  );
}

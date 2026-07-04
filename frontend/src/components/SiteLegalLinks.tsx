import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../constants/legal";

type Props = {
  className?: string;
};

export default function SiteLegalLinks({ className = "" }: Props) {
  return (
    <nav
      className={`site-legal-links${className ? ` ${className}` : ""}`}
      aria-label="Legal and support"
    >
      <Link to="/privacy">Privacy</Link>
      <span className="site-legal-links__sep" aria-hidden>
        ·
      </span>
      <Link to="/terms">Terms</Link>
      <span className="site-legal-links__sep" aria-hidden>
        ·
      </span>
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    </nav>
  );
}

import { Link } from "react-router-dom";

type Props = {
  variant?: "header" | "nav";
  className?: string;
};

/** Premium AI Tutor entry — routes to coming-soon page for now. */
export default function AiTutorNavButton({ variant = "header", className = "" }: Props) {
  const cls =
    variant === "header"
      ? `ai-tutor-btn ai-tutor-btn--header ${className}`
      : `stitch-desktop-nav__link ai-tutor-btn ai-tutor-btn--nav ${className}`;

  return (
    <Link to="/ai-tutor" className={cls} title="AI Tutor — guided explanations">
      <span className="material-symbols-outlined stitch-desktop-nav__icon">psychology</span>
      <span className="stitch-desktop-nav__label">AI Tutor</span>
      <span className="ai-tutor-btn__badge">AI</span>
    </Link>
  );
}

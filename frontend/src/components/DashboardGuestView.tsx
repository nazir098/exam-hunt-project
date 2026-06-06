import { Link } from "react-router-dom";
import { BRAND_NAME } from "../design/stitchAssets";
import GuestHeroMockup from "./GuestHeroMockup";
import type { PlatformStats } from "../utils/platformStats";

const HERO_FEATURES = [
  { icon: "menu_book", label: "PYQs" },
  { icon: "bolt", label: "Adaptive Practice" },
  { icon: "auto_awesome", label: "Instant Explanations" },
  { icon: "insights", label: "Performance Analytics" },
] as const;

const BENEFITS = [
  {
    icon: "bolt",
    title: "Adaptive Practice",
    desc: "Sessions adjust difficulty after every answer so you train at the right level.",
  },
  {
    icon: "psychology",
    title: "AI Explanations",
    desc: "Step-by-step reasoning and concept nudges tied to each PYQ (rolling out).",
  },
  {
    icon: "insights",
    title: "Performance Analytics",
    desc: "Accuracy trends, heatmaps, and chapter-level marks so you know what to revise.",
  },
  {
    icon: "bookmark",
    title: "Revision & Bookmarks",
    desc: "Save weak spots, rate questions, and revisit topics before exam day.",
  },
] as const;

type Props = {
  stats: PlatformStats;
};

function pyqFeatureLabel(totalQuestions: number): string {
  return `${totalQuestions.toLocaleString()}+ PYQs`;
}

export default function DashboardGuestView({ stats }: Props) {
  const features = HERO_FEATURES.map((f) =>
    f.label === "PYQs" ? { ...f, label: pyqFeatureLabel(stats.totalQuestions) } : f
  );

  return (
    <div className="dash-guest">
      <section className="dash-guest-hero">
        <div className="dash-guest-hero__copy">
          <h1 className="dash-guest-headline">
            Master NEET
            <span className="dash-guest-headline-accent"> with AI</span>
          </h1>
          <ul className="dash-guest-features">
            {features.map((f) => (
              <li key={f.label}>
                <span className="material-symbols-outlined">{f.icon}</span>
                {f.label}
              </li>
            ))}
          </ul>
          <Link to="/register?next=/practice" className="btn primary dash-guest-cta-primary">
            <span className="material-symbols-outlined">play_arrow</span>
            Start Practicing
          </Link>
          <p className="dash-guest-signin">
            Already have an account?{" "}
            <Link to="/login?next=/practice" className="dash-guest-signin-link">
              Sign in
            </Link>
          </p>
        </div>
        <GuestHeroMockup />
      </section>

      <section className="dash-guest-benefits">
        <h2 className="dash-section-title">Why top aspirants switch to {BRAND_NAME}</h2>
        <div className="dash-guest-benefits__grid">
          {BENEFITS.map((b) => (
            <article key={b.title} className="dash-guest-benefit glass-card">
              <span className="material-symbols-outlined">{b.icon}</span>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dash-guest-cta-band glass-card">
        <div>
          <h2>Ready for exam-day scoring?</h2>
          <p>Free account · Real NEET +4/−1 marks · Progress on every device</p>
        </div>
        <Link to="/register?next=/practice" className="btn primary">
          Create free account
        </Link>
      </section>
    </div>
  );
}

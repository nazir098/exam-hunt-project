import { Link } from "react-router-dom";
import { ExamCatalogEntry, PackSummary } from "../api";
import { BRAND_NAME } from "../design/stitchAssets";

type Props = {
  packs: PackSummary[];
  catalog: ExamCatalogEntry[];
  packId: string;
  subject: string;
  adaptive: boolean;
  onPackId: (id: string) => void;
  onSubject: (subject: string) => void;
  onAdaptive: (value: boolean) => void;
};

const BENEFITS = [
  {
    icon: "military_tech",
    title: "Real exam scoring",
    desc: "Every answer uses NEET marks (+4 correct, −1 wrong) so your score matches test day.",
  },
  {
    icon: "insights",
    title: "Progress that sticks",
    desc: "Accuracy, streaks, and session history sync to your dashboard automatically.",
  },
  {
    icon: "emoji_events",
    title: "Climb the leaderboard",
    desc: "Compete weekly and monthly against other students practicing the same PYQs.",
  },
  {
    icon: "devices",
    title: "Pick up where you left off",
    desc: "Resume sessions on any device — your account keeps marks and ratings safe.",
  },
] as const;

const AI_HIGHLIGHTS = [
  {
    icon: "auto_awesome",
    title: "Adaptive sessions",
    desc: "Difficulty shifts after each answer so you train at the edge of your ability.",
  },
  {
    icon: "psychology",
    title: "AI tutor insights",
    desc: "Get guided explanations and concept nudges tied to each PYQ (rolling out soon).",
  },
  {
    icon: "monitoring",
    title: "Weak-topic radar",
    desc: "Analytics highlight chapters that cost you marks so you revise smarter.",
  },
] as const;

const FEATURE_CARDS = [
  {
    icon: "bolt",
    title: "Scored Practice",
    desc: "20-question runs with live marks and instant feedback after every submit.",
    to: "/register?next=/practice",
  },
  {
    icon: "menu_book",
    title: "NEET Question Bank",
    desc: "Browse official-style PYQs with solutions — study mode without saving marks.",
    to: "/bank?exam=NEET",
  },
  {
    icon: "insights",
    title: "Analytics",
    desc: "Heatmaps, accuracy trends, and session timelines once you sign in.",
    to: "/register?next=/analytics",
  },
  {
    icon: "emoji_events",
    title: "Leaderboard",
    desc: "See where your practice marks rank among peers this week.",
    to: "/leaderboard",
  },
] as const;

export default function PracticeGuestLanding({
  packs,
  catalog,
  packId,
  subject,
  adaptive,
  onPackId,
  onSubject,
  onAdaptive,
}: Props) {
  const neet = catalog.find((c) => c.id === "NEET");
  const totalQuestions =
    neet?.totalQuestions ?? packs.reduce((sum, p) => sum + p.questionCount, 0);
  const liveYears = neet?.availableYears ?? packs.length;
  const selectedPack = packs.find((p) => p.packId === packId) ?? packs[0];
  const registerHref = `/register?next=${encodeURIComponent("/practice")}`;
  const loginHref = `/login?next=${encodeURIComponent("/practice")}`;

  return (
    <div className="practice-landing">
      <section className="practice-landing-hero glass-card">
        <div className="practice-landing-hero__copy">
          <p className="practice-landing-eyebrow">NEET UG · Scored practice</p>
          <h1 className="practice-landing-headline">
            Train like exam day.
            <span className="practice-landing-headline-accent"> Marks that matter.</span>
          </h1>
          <p className="practice-landing-lead">
            {BRAND_NAME} turns previous-year NEET questions into adaptive practice sessions — with
            real +4/−1 scoring, analytics, and AI-guided learning so you know exactly what to fix
            before the test.
          </p>
          <div className="practice-landing-hero__ctas">
            <Link to={registerHref} className="btn primary practice-landing-cta-primary">
              <span className="material-symbols-outlined">rocket_launch</span>
              Create free account &amp; start
            </Link>
            <Link to={loginHref} className="btn practice-landing-cta-secondary">
              I already have an account
            </Link>
          </div>
          <p className="practice-landing-hero__fine">
            Free to join · No card required ·{" "}
            <Link to="/bank?exam=NEET">Browse PYQs without signing in</Link>
          </p>
        </div>
        <ul className="practice-landing-stats" aria-label="Platform stats">
          <li>
            <strong>{totalQuestions > 0 ? `${totalQuestions}+` : "400+"}</strong>
            <span>NEET PYQs</span>
          </li>
          <li>
            <strong>{liveYears > 0 ? liveYears : "3"}</strong>
            <span>Years live</span>
          </li>
          <li>
            <strong>+4 / −1</strong>
            <span>Exam scoring</span>
          </li>
          <li>
            <strong>20</strong>
            <span>Qs / session</span>
          </li>
        </ul>
      </section>

      <div className="practice-landing-grid">
        <section className="practice-landing-benefits glass-card">
          <h2 className="practice-landing-section-title">Why students create an account</h2>
          <ul className="practice-landing-benefit-list">
            {BENEFITS.map((b) => (
              <li key={b.title}>
                <span className="practice-landing-benefit-icon material-symbols-outlined">{b.icon}</span>
                <div>
                  <strong>{b.title}</strong>
                  <p>{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="practice-landing-preview glass-card" aria-label="Session preview">
          <div className="practice-landing-preview__badge">
            <span className="material-symbols-outlined">visibility</span>
            Live session preview
          </div>
          <div className="practice-landing-preview__meta">
            <span>NEET {selectedPack?.year ?? "2016"}</span>
            <span>·</span>
            <span>{subject || "All subjects"}</span>
            <span>·</span>
            <span>{adaptive ? "Adaptive" : "Fixed level"}</span>
          </div>
          <div className="practice-landing-preview__progress" aria-hidden>
            <div className="practice-landing-preview__progress-fill" style={{ width: "15%" }} />
          </div>
          <p className="practice-landing-preview__progress-label">Question 3 of 20 · +8 marks so far</p>
          <div className="practice-landing-preview__question">
            <p className="practice-landing-preview__q-label">Sample MCQ</p>
            <p>
              A particle moves with constant acceleration. Which graph best represents velocity vs
              time?
            </p>
            <div className="practice-landing-preview__options">
              <span className="selected">A</span>
              <span>B</span>
              <span>C</span>
              <span>D</span>
            </div>
          </div>
          <p className="practice-landing-preview__footnote muted">
            Sign in to run real sessions — marks, ratings, and analytics save after each submit.
          </p>
        </aside>
      </div>

      <section className="practice-landing-ai glass-card">
        <div className="practice-landing-ai__header">
          <h2 className="practice-landing-section-title">AI-powered learning</h2>
          <p className="muted">
            Built for NEET prep: adaptive pacing today, deeper AI tutor features on the way.
          </p>
        </div>
        <div className="practice-landing-ai__grid">
          {AI_HIGHLIGHTS.map((item) => (
            <article key={item.title} className="practice-landing-ai-card">
              <span className="material-symbols-outlined practice-landing-ai-card__icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="practice-landing-quickstart glass-card">
        <div className="practice-landing-quickstart__header">
          <h2 className="practice-landing-section-title">Your first session is one tap away</h2>
          <p className="muted">
            Choose a starting pack below — we&apos;ll remember it when you finish signing up.
          </p>
        </div>
        <div className="practice-landing-quickstart__fields">
          <div className="filter-block">
            <span className="filter-label">Year / pack</span>
            <select value={packId} onChange={(e) => onPackId(e.target.value)} disabled={!packs.length}>
              {packs.length ? (
                packs.map((p) => (
                  <option key={p.packId} value={p.packId}>
                    NEET {p.year} ({p.questionCount} questions)
                  </option>
                ))
              ) : (
                <option>Loading packs…</option>
              )}
            </select>
          </div>
          {selectedPack?.facets?.subjects && (
            <div className="filter-block">
              <span className="filter-label">Focus subject (optional)</span>
              <select value={subject} onChange={(e) => onSubject(e.target.value)}>
                <option value="">All subjects</option>
                {selectedPack.facets.subjects.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="practice-adaptive-toggle">
            <input
              type="checkbox"
              checked={adaptive}
              onChange={(e) => onAdaptive(e.target.checked)}
            />
            Adaptive difficulty — recommended for most students
          </label>
        </div>
        <Link to={registerHref} className="btn primary btn-block practice-landing-cta-primary">
          <span className="material-symbols-outlined">person_add</span>
          Sign up free — start practicing
        </Link>
        <p className="practice-landing-quickstart__alt muted">
          Already practicing? <Link to={loginHref}>Sign in to continue</Link>
        </p>
      </section>

      <section className="practice-landing-social">
        <div className="practice-landing-social__quote glass-card">
          <span className="material-symbols-outlined practice-landing-social__stars">format_quote</span>
          <blockquote>
            &ldquo;Finally practice that feels like NEET — every wrong answer costs a mark, so I
            stopped guessing and started reviewing analytics.&rdquo;
          </blockquote>
          <cite>— NEET 2026 aspirant, beta cohort</cite>
        </div>
        <ul className="practice-landing-social__proof">
          <li>
            <span className="material-symbols-outlined">verified</span>
            Official-style PYQ images from published manifests
          </li>
          <li>
            <span className="material-symbols-outlined">groups</span>
            Leaderboard updated from real practice attempts
          </li>
          <li>
            <span className="material-symbols-outlined">shield</span>
            Your progress stays private to your account
          </li>
        </ul>
      </section>

      <section className="practice-landing-features">
        <h2 className="practice-landing-section-title practice-landing-features__title">
          Everything in one prep platform
        </h2>
        <div className="practice-landing-features__grid">
          {FEATURE_CARDS.map((card) => (
            <Link key={card.title} to={card.to} className="practice-landing-feature-card glass-card">
              <span className="material-symbols-outlined">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <span className="practice-landing-feature-card__link">
                Explore <span className="material-symbols-outlined">arrow_forward</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="practice-landing-footer-cta glass-card">
        <h2>Ready to turn PYQs into marks?</h2>
        <p>Join {BRAND_NAME} and start your first scored NEET session in under a minute.</p>
        <Link to={registerHref} className="btn primary practice-landing-cta-primary">
          Get started — it&apos;s free
        </Link>
      </section>
    </div>
  );
}

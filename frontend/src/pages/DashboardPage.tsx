import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { STITCH_PYQ_HERO } from "../design/stitchAssets";

const SUBJECTS = [
  { name: "Physics", icon: "architecture", pct: "78%", desc: "Mechanics, Thermodynamics & Optics.", iconBg: "bg-primary-container/20", iconColor: "text-primary" },
  { name: "Chemistry", icon: "experiment", pct: "92%", desc: "Organic, Inorganic & Physical.", iconBg: "bg-secondary-container/20", iconColor: "text-secondary" },
  { name: "Biology", icon: "biotech", pct: "65%", desc: "Botany, Zoology & Genetics.", iconBg: "bg-tertiary-container/20", iconColor: "text-tertiary" },
  { name: "Mathematics", icon: "calculate", pct: "41%", desc: "Calculus, Algebra & Geometry.", iconBg: "bg-primary/10", iconColor: "text-primary" },
];

const CHAPTERS = [
  { n: "01", title: "Electrostatics", count: "142 Questions Available" },
  { n: "02", title: "Mole Concept", count: "98 Questions Available" },
  { n: "03", title: "Plant Physiology", count: "215 Questions Available" },
  { n: "04", title: "Human Reproduction", count: "187 Questions Available" },
];

export default function DashboardPage() {
  const { user, progress } = useAuth();
  const [barWidth, setBarWidth] = useState("0%");
  const attempts = progress?.totalAttempts ?? 0;
  const accuracy = progress?.accuracyPercent ?? 85;
  const streak = user ? Math.min(14, Math.max(1, attempts)) : 14;
  const dailyPct = user && attempts > 0 ? Math.min(84, Math.round((attempts % 50) * 1.68)) : 84;

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(`${dailyPct}%`), 500);
    return () => clearTimeout(t);
  }, [dailyPct]);

  return (
    <main className="relative pb-6 px-margin-mobile">
      <header className="py-xl flex flex-col items-stretch gap-gutter">
        <div className="flex-1 space-y-md">
          <div className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-primary-container/10 border border-primary/20 text-primary text-caption font-caption">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            ADAPTIVE AI ENGINE ACTIVE
          </div>
          <h1 className="text-display-lg-mobile md:text-display-lg font-display-lg-mobile md:font-display-lg text-on-surface leading-tight">
            Master the Exams with <span className="text-primary">AI-First</span> Learning
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant max-w-lg">
            Personalized preparation paths for NEET and JEE, powered by deep analytics and real-time AI
            tutoring to accelerate your mastery.
          </p>
          <div className="pt-sm flex flex-wrap gap-md">
            <Link
              to="/bank?exam=NEET"
              className="electric-glow px-xl py-md rounded-xl text-on-primary-container font-headline-md text-label-md flex items-center gap-sm transition-all duration-200 active:scale-95"
            >
              Launch AI Study Assistant
              <span className="material-symbols-outlined">bolt</span>
            </Link>
            <Link
              to="/bank?exam=NEET"
              className="glass-card px-xl py-md rounded-xl text-on-surface font-label-md text-label-md border border-white/10 hover:bg-white/5 transition-all"
            >
              View Sample Papers
            </Link>
          </div>
        </div>

        <div className="w-full glass-card p-lg rounded-xxl space-y-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-lg opacity-10">
            <span className="material-symbols-outlined text-[120px]">monitoring</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-caption font-caption text-on-surface-variant uppercase tracking-wider">Current Streak</p>
              <h3 className="text-headline-lg font-headline-lg text-secondary flex items-center gap-xs">
                {streak} Days{" "}
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
              </h3>
            </div>
            <div className="text-right">
              <p className="text-caption font-caption text-on-surface-variant uppercase tracking-wider">Mastery Score</p>
              <h3 className="text-headline-lg font-headline-lg text-primary">
                {user && accuracy != null ? `${accuracy}%` : "85%"}
              </h3>
            </div>
          </div>
          <div className="space-y-sm">
            <div className="flex justify-between text-caption font-caption">
              <span>Daily Target</span>
              <span className="text-secondary">{user ? `${attempts % 50}/50` : "42/50"} Questions</span>
            </div>
            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full progress-gradient transition-all duration-[1500ms]" style={{ width: barWidth }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm pt-sm">
            <div className="p-sm rounded-lg bg-white/5 flex items-center gap-sm">
              <span className="material-symbols-outlined text-tertiary">history_edu</span>
              <div>
                <p className="text-[10px] uppercase font-bold opacity-50">Last Active</p>
                <p className="text-body-sm font-body-sm">Organic Chem</p>
              </div>
            </div>
            <div className="p-sm rounded-lg bg-white/5 flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">verified</span>
              <div>
                <p className="text-[10px] uppercase font-bold opacity-50">Accuracy</p>
                <p className="text-body-sm font-body-sm">{user && accuracy != null ? `${accuracy}%` : "92.4%"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="py-xl">
        <h2 className="text-headline-lg font-headline-lg mb-lg">Focus Areas</h2>
        <div className="grid grid-cols-1 gap-gutter">
          {SUBJECTS.map((s) => (
            <Link
              key={s.name}
              to={`/bank?exam=NEET&subject=${encodeURIComponent(s.name)}`}
              className="glass-card p-lg rounded-xxl group cursor-pointer transition-all duration-300 hover:-translate-y-2 block"
            >
              <div
                className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center ${s.iconColor} mb-md group-hover:scale-110 transition-transform`}
              >
                <span className="material-symbols-outlined text-headline-md">{s.icon}</span>
              </div>
              <h3 className="text-headline-md font-headline-md mb-xs">{s.name}</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant mb-lg">{s.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-caption font-caption text-secondary">{s.pct} Mastered</span>
                <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-xl space-y-lg">
        <div className="space-y-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-lg font-headline-lg">Daily Practice Challenges</h2>
            <Link to="/practice" className="text-primary text-label-md font-label-md flex items-center gap-xs">
              View All <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-md">
            <div className="glass-card p-lg rounded-xl flex gap-md items-start border-l-4 border-l-primary">
              <div className="bg-primary/10 p-sm rounded-lg text-primary">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div className="space-y-xs">
                <h4 className="font-bold text-body-md">Speed Sprint: Physics</h4>
                <p className="text-caption text-on-surface-variant">10 Questions • 8 Minutes • High Difficulty</p>
                <Link to="/practice" className="text-primary font-bold text-[13px] pt-xs inline-block">
                  START CHALLENGE
                </Link>
              </div>
            </div>
            <div className="glass-card p-lg rounded-xl flex gap-md items-start border-l-4 border-l-secondary">
              <div className="bg-secondary/10 p-sm rounded-lg text-secondary">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <div className="space-y-xs">
                <h4 className="font-bold text-body-md">Concept Drill: Biology</h4>
                <p className="text-caption text-on-surface-variant">15 Questions • No Timer • Moderate Difficulty</p>
                <Link to="/practice" className="text-secondary font-bold text-[13px] pt-xs inline-block">
                  RESUME DRILL
                </Link>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xxl p-lg relative overflow-hidden">
            <div className="flex flex-col items-stretch gap-lg">
              <div className="flex-1 space-y-sm text-left">
                <div className="inline-block px-3 py-1 rounded bg-secondary-container/30 text-secondary-fixed text-[10px] font-bold tracking-widest" style={{ color: "#6ffbbe" }}>
                  PYQ HUB
                </div>
                <h3 className="text-headline-md font-headline-md">Previous Year Question Vault</h3>
                <p className="text-body-sm font-body-sm text-on-surface-variant">
                  Access 15+ years of NEET/JEE questions with AI-generated step-by-step solutions and concept
                  mapping.
                </p>
                <div className="flex gap-md pt-sm justify-start flex-wrap">
                  <span className="flex items-center gap-xs text-caption">
                    <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span> Verified
                    Solutions
                  </span>
                  <span className="flex items-center gap-xs text-caption">
                    <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span> Image
                    PYQs
                  </span>
                </div>
              </div>
              <Link
                to="/bank?exam=NEET"
                className="w-full aspect-video rounded-xl bg-surface-container-highest flex items-center justify-center relative group cursor-pointer overflow-hidden"
              >
                <img
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110"
                  src={STITCH_PYQ_HERO}
                />
                <div className="z-10 bg-primary/80 p-sm rounded-full text-white">
                  <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-lg">
          <h2 className="text-headline-md font-headline-md">Chapter-wise Drill</h2>
          <div className="glass-card rounded-xxl divide-y divide-white/5">
            {CHAPTERS.map((ch) => (
              <Link
                key={ch.n}
                to="/bank?exam=NEET"
                className="p-md hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between block"
              >
                <div className="flex items-center gap-md">
                  <span className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-fixed text-sm font-bold">
                    {ch.n}
                  </span>
                  <div>
                    <h4 className="font-bold text-body-sm">{ch.title}</h4>
                    <p className="text-[10px] text-on-surface-variant">{ch.count}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
              </Link>
            ))}
          </div>
          <Link
            to="/bank?exam=NEET"
            className="w-full glass-card p-md rounded-xl text-primary font-bold hover:bg-primary/5 transition-colors block text-center"
          >
            EXPLORE ALL CHAPTERS
          </Link>
        </div>
      </section>
    </main>
  );
}

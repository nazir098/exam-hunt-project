/** Decorative glassmorphism dashboard preview for the guest landing hero. */
export default function GuestHeroMockup() {
  const bars = [42, 58, 48, 72, 65, 78, 68, 82];

  return (
    <div className="guest-mockup" aria-hidden>
      <div className="guest-mockup__frame glass-card">
        <div className="guest-mockup__toolbar">
          <span className="guest-mockup__dot" />
          <span className="guest-mockup__dot" />
          <span className="guest-mockup__dot" />
          <span className="guest-mockup__toolbar-title">Practice · NEET 2026</span>
        </div>

        <div className="guest-mockup__chips">
          <span className="guest-mockup__chip guest-mockup__chip--plus">
            <span className="material-symbols-outlined">add_circle</span>
            +4 correct
          </span>
          <span className="guest-mockup__chip guest-mockup__chip--minus">
            <span className="material-symbols-outlined">remove_circle</span>
            −1 wrong
          </span>
          <span className="guest-mockup__chip guest-mockup__chip--ai">
            <span className="material-symbols-outlined">psychology</span>
            AI Tutor
          </span>
        </div>

        <div className="guest-mockup__chart glass-card">
          <div className="guest-mockup__chart-head">
            <span>Live accuracy</span>
            <strong>68%</strong>
          </div>
          <div className="guest-mockup__bars">
            {bars.map((h, i) => (
              <span
                key={i}
                className="guest-mockup__bar"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="guest-mockup__question glass-card">
          <p className="guest-mockup__q-meta">Q12 · Physics · Kinematics</p>
          <p className="guest-mockup__q-text">
            A ball is projected at 45°. What is the horizontal range at maximum height?
          </p>
          <div className="guest-mockup__options">
            <span className="guest-mockup__opt guest-mockup__opt--active">A · 20 m</span>
            <span className="guest-mockup__opt">B · 40 m</span>
            <span className="guest-mockup__opt">C · 60 m</span>
          </div>
        </div>
      </div>
      <div className="guest-mockup__glow" />
    </div>
  );
}

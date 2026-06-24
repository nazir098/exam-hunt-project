import { useEffect, useState } from "react";

type Props = {
  activeSeconds: number;
  engagedSince?: string | null;
  label?: string;
  compact?: boolean;
};

function formatElapsed(totalSeconds: number): { text: string; hasHours: boolean } {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return {
      text: `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      hasHours: true,
    };
  }
  return {
    text: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    hasHours: false,
  };
}

export default function SessionTimer({ activeSeconds, engagedSince, label = "Time", compact }: Props) {
  const [elapsed, setElapsed] = useState(activeSeconds);

  useEffect(() => {
    const base = Math.max(0, activeSeconds);
    const engagedAt = engagedSince ? new Date(engagedSince).getTime() : null;

    const tick = () => {
      if (!engagedAt) {
        setElapsed(base);
        return;
      }
      const segment = Math.max(0, Math.floor((Date.now() - engagedAt) / 1000));
      setElapsed(base + segment);
    };

    tick();
    if (!engagedAt) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeSeconds, engagedSince]);

  const { text, hasHours } = formatElapsed(elapsed);

  return (
    <span className={`session-timer${compact ? " session-timer--compact" : ""}`} aria-live="polite">
      <span className="session-timer__label">{label}</span>
      <strong className={`session-timer__value${hasHours ? " session-timer__value--hours" : ""}`}>
        {text}
      </strong>
    </span>
  );
}

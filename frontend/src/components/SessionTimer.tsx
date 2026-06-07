import { useEffect, useState } from "react";

type Props = {
  startedAt: string;
  label?: string;
  compact?: boolean;
};

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SessionTimer({ startedAt, label = "Time", compact }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return (
    <span className={`session-timer${compact ? " session-timer--compact" : ""}`} aria-live="polite">
      <span className="session-timer__label">{label}</span>
      <strong>{formatElapsed(elapsed)}</strong>
    </span>
  );
}

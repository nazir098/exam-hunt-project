import type { PackSummary } from "../api";
import { formatPackLabel } from "../utils/practiceHub";

type Props = {
  sessionSize: number;
  estMinutes: number;
  adaptive: boolean;
  pack: PackSummary | null;
  busy: boolean;
  disabled: boolean;
  signedIn: boolean;
  onStart: () => void;
};

export default function PracticeBankStartBanner({
  sessionSize,
  estMinutes,
  adaptive,
  pack,
  busy,
  disabled,
  signedIn,
  onStart,
}: Props) {
  const packLabel = pack ? formatPackLabel(pack.packId) : "NEET";
  const meta = [packLabel, adaptive ? "Adaptive" : "Fixed order", `~${estMinutes} min`].join(" · ");

  return (
    <section className="practice-bank-start-banner" aria-label="Start practice session">
      <div className="practice-bank-start-banner__info">
        <span className="practice-bank-start-banner__icon material-symbols-outlined" aria-hidden>
          bolt
        </span>
        <div>
          <p className="practice-bank-start-banner__title">
            <strong>{sessionSize}</strong> questions selected
          </p>
          <p className="practice-bank-start-banner__meta">{meta}</p>
        </div>
      </div>
      <button
        type="button"
        className="practice-bank-start-banner__cta"
        disabled={disabled || busy}
        onClick={onStart}
      >
        {busy ? "Starting…" : signedIn ? "Start Practice Now" : "Sign in to practice"}
        {!busy && (
          <span className="material-symbols-outlined" aria-hidden>
            arrow_forward
          </span>
        )}
      </button>
    </section>
  );
}

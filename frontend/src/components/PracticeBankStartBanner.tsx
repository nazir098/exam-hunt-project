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
  filterCount?: number;
  scopeLabel?: string;
  onStart: () => void;
  onEditSelection?: () => void;
};

export default function PracticeBankStartBanner({
  sessionSize,
  estMinutes,
  adaptive,
  pack,
  busy,
  disabled,
  signedIn,
  filterCount = 0,
  scopeLabel,
  onStart,
  onEditSelection,
}: Props) {
  const packLabel = pack ? formatPackLabel(pack.packId) : "NEET";
  const meta = [
    scopeLabel || packLabel,
    adaptive ? "Adaptive" : "Fixed",
    `~${estMinutes} min`,
  ].join(" · ");

  return (
    <section className="practice-bank-start-banner" aria-label="Start practice session">
      <button
        type="button"
        className="practice-bank-start-banner__selection"
        onClick={onEditSelection}
        disabled={!onEditSelection}
        aria-label="Change filters, topics, and question count"
      >
        <span className="practice-bank-start-banner__count" aria-hidden>
          {sessionSize}
        </span>
        <span className="practice-bank-start-banner__copy">
          <span className="practice-bank-start-banner__title">questions selected</span>
          <span className="practice-bank-start-banner__meta">{meta}</span>
        </span>
        <span className="practice-bank-start-banner__edit">
          <span className="material-symbols-outlined" aria-hidden>
            tune
          </span>
          <span className="practice-bank-start-banner__edit-label">Change</span>
          {filterCount > 0 && (
            <span className="practice-bank-start-banner__filter-badge">{filterCount}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        className="practice-bank-start-banner__cta"
        disabled={disabled || busy}
        onClick={onStart}
      >
        {busy ? "Starting…" : signedIn ? "Start" : "Sign in"}
        {!busy && signedIn && (
          <span className="material-symbols-outlined" aria-hidden>
            arrow_forward
          </span>
        )}
      </button>
    </section>
  );
}

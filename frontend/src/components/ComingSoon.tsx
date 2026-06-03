type Props = {
  examName: string;
  description: string;
  onBack?: () => void;
};

export default function ComingSoon({ examName, description, onBack }: Props) {
  return (
    <div className="coming-soon card">
      <div className="coming-soon-icon" aria-hidden>
        🚧
      </div>
      <h2>{examName} — coming soon</h2>
      <p className="coming-soon-lead">{description}</p>
      <p className="muted coming-soon-note">
        We&apos;re focused on NEET previous year papers first. More exams will roll out here as content
        is ready.
      </p>
      {onBack && (
        <button type="button" className="btn primary" onClick={onBack}>
          Browse NEET questions
        </button>
      )}
    </div>
  );
}

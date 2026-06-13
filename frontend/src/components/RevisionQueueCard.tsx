import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRevisionSummary } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function RevisionQueueCard() {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchRevisionSummary()
      .then((s) => setPending(s.pending))
      .catch(() => setPending(0));
  }, [user?.id]);

  if (!user || pending === 0) return null;

  return (
    <section className="glass-card revision-queue-card" aria-label="Revision queue">
      <div className="revision-queue-card__icon" aria-hidden>
        <span className="material-symbols-outlined">history_edu</span>
      </div>
      <div className="revision-queue-card__body">
        <h2 className="revision-queue-card__title">Revision queue</h2>
        <p className="revision-queue-card__count">
          {pending} question{pending === 1 ? "" : "s"} pending
        </p>
      </div>
      <Link to="/revision?status=pending" className="btn primary revision-queue-card__cta">
        Review now
      </Link>
    </section>
  );
}

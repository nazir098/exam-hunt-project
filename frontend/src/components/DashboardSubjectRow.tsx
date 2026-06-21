import { Link } from "react-router-dom";
import type { ProgressSummary } from "../api";
import { weakestChapterForSubject } from "../utils/dashboardStats";
import { weakChapterBankUrl } from "../utils/weakChapters";

const SUBJECTS = [
  { name: "Physics", icon: "architecture", tone: "physics" },
  { name: "Biology", icon: "eco", tone: "biology" },
  { name: "Chemistry", icon: "science", tone: "chemistry" },
] as const;

type Props = {
  progress: ProgressSummary | null;
};

export default function DashboardSubjectRow({ progress }: Props) {
  return (
    <section className="dash-v2-subjects" aria-label="Subject focus">
      {SUBJECTS.map((subject) => {
        const weak = weakestChapterForSubject(progress?.weakChapters, subject.name);
        const label = weak ? `${weak.chapter} (${weak.accuracyPercent}%)` : "No data yet";
        const to = weak ? weakChapterBankUrl(weak) : `/practice?subject=${encodeURIComponent(subject.name)}#question-bank`;

        return (
          <Link key={subject.name} to={to} className={`dash-v2-subject glass-card dash-v2-subject--${subject.tone}`}>
            <span className="material-symbols-outlined dash-v2-subject__icon">{subject.icon}</span>
            <div className="dash-v2-subject__copy">
              <strong>{subject.name}</strong>
              <span>{label}</span>
            </div>
            <span className="material-symbols-outlined dash-v2-subject__arrow">chevron_right</span>
          </Link>
        );
      })}
    </section>
  );
}

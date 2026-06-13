import PracticeStudyAssistant, {
  type PracticeStudyAssistantProps,
} from "./PracticeStudyAssistant";
import TestTileLegend from "./TestTileLegend";

type Props = {
  assistant: Omit<PracticeStudyAssistantProps, "layout" | "embedded">;
};

export default function TestRunSidebar({ assistant }: Props) {
  return (
    <div className="test-run-sidebar glass-card">
      <TestTileLegend />
      <div className="test-run-sidebar__divider" aria-hidden />
      <PracticeStudyAssistant {...assistant} layout="sidebar" embedded examLocked />
    </div>
  );
}

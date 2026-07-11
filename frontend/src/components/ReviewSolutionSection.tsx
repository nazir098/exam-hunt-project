import OfficialSolutionBody from "./OfficialSolutionBody";
import type { PracticeQuestion } from "../api";
import { pickSolutionDisplay } from "../utils/questionSolution";

type Props = {
  question: PracticeQuestion;
  hasSolution: boolean;
  showSolution: boolean;
  onToggle: () => void;
};

export default function ReviewSolutionSection({
  question,
  hasSolution,
  showSolution,
  onToggle,
}: Props) {
  const display = pickSolutionDisplay(question);
  const showable = hasSolution || display.kind !== "empty";
  if (!showable) return null;

  return (
    <div className="session-review-panel__solution">
      <button type="button" className="practice-run-solution__toggle" onClick={onToggle}>
        {showSolution ? "Hide explanation" : "View explanation"}
      </button>
      {showSolution && (
        <OfficialSolutionBody
          questionId={question.questionId}
          questionNo={question.questionNo}
          solutionTextPreview={question.solutionTextPreview}
          solutionImageUrl={question.solutionImageUrl}
          solutionDiagramSvg={question.solutionDiagramSvg}
          assetPlacements={question.assetPlacements}
          solutionAssetPlacements={question.solutionAssetPlacements}
          contentTextNormalized={question.contentTextNormalized}
          renderMode={question.renderMode}
          sourceType={question.sourceType}
        />
      )}
    </div>
  );
}

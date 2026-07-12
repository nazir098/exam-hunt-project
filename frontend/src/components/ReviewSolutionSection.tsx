import { useEffect, useState } from "react";
import OfficialSolutionBody from "./OfficialSolutionBody";
import { fetchPracticeSolution, type AssetPlacementView, type PracticeQuestion } from "../api";
import { pickSolutionDisplay } from "../utils/questionSolution";

type Props = {
  question: PracticeQuestion;
  hasSolution: boolean;
  showSolution: boolean;
  onToggle: () => void;
};

type RevealedSolution = {
  solutionTextPreview: string;
  solutionImageUrl: string;
  solutionDiagramSvg: string;
  solutionAssetPlacements: AssetPlacementView[];
};

export default function ReviewSolutionSection({
  question,
  hasSolution,
  showSolution,
  onToggle,
}: Props) {
  const [revealed, setRevealed] = useState<RevealedSolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const embedded = pickSolutionDisplay(question);
  const showable = hasSolution || embedded.kind !== "empty" || revealed != null;

  useEffect(() => {
    setRevealed(null);
    setError("");
  }, [question.questionId]);

  useEffect(() => {
    if (!showSolution || !hasSolution) return;
    if (pickSolutionDisplay(question).kind !== "empty") return;
    if (revealed) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPracticeSolution(question.questionId)
      .then((res) => {
        if (cancelled) return;
        if (!res.hasSolution) {
          setError("No official solution is available for this question.");
          return;
        }
        setRevealed({
          solutionTextPreview: res.solutionTextPreview ?? "",
          solutionImageUrl: res.solutionImageUrl ?? "",
          solutionDiagramSvg: res.solutionDiagramSvg ?? "",
          solutionAssetPlacements: res.solutionAssetPlacements ?? [],
        });
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load solution");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showSolution, hasSolution, question, revealed]);

  if (!showable) return null;

  const solutionText = revealed?.solutionTextPreview ?? question.solutionTextPreview;
  const solutionImageUrl = revealed?.solutionImageUrl ?? question.solutionImageUrl;
  const solutionDiagramSvg = revealed?.solutionDiagramSvg ?? question.solutionDiagramSvg;
  const solutionAssetPlacements =
    revealed?.solutionAssetPlacements ?? question.solutionAssetPlacements;

  return (
    <div className="session-review-panel__solution">
      <button type="button" className="practice-run-solution__toggle" onClick={onToggle}>
        {showSolution ? "Hide explanation" : "View explanation"}
      </button>
      {showSolution && (
        <>
          {loading && <p className="muted">Loading explanation…</p>}
          {error && <p className="error-text">{error}</p>}
          {!loading && !error && (
            <OfficialSolutionBody
              questionId={question.questionId}
              questionNo={question.questionNo}
              solutionTextPreview={solutionText}
              solutionImageUrl={solutionImageUrl}
              solutionDiagramSvg={solutionDiagramSvg}
              assetPlacements={question.assetPlacements}
              solutionAssetPlacements={solutionAssetPlacements}
              contentTextNormalized={question.contentTextNormalized}
              renderMode={question.renderMode}
              sourceType={question.sourceType}
            />
          )}
        </>
      )}
    </div>
  );
}

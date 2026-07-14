import InlineAssetMarkdown from "./InlineAssetMarkdown";
import ZoomableImage from "./ZoomableImage";
import type { AssetPlacementView } from "../api";
import { cacheBustImageUrl } from "../utils/questionRender";
import { displayPyqSolution } from "../utils/pyqTextDisplay";
import { pickSolutionDisplay, type SolutionFields } from "../utils/questionSolution";

type Props = SolutionFields & {
  questionId: string;
  questionNo?: number;
  assetPlacements?: AssetPlacementView[];
  solutionAssetPlacements?: AssetPlacementView[];
  contentTextNormalized?: boolean;
  renderMode?: string;
  sourceType?: string;
  emptyMessage?: string;
};

export default function OfficialSolutionBody({
  questionId,
  questionNo,
  assetPlacements,
  solutionAssetPlacements,
  solutionTextPreview,
  solutionImageUrl,
  solutionDiagramSvg,
  contentTextNormalized,
  renderMode,
  sourceType,
  emptyMessage = "Solution isn’t available for this question yet.",
}: Props) {
  const display = pickSolutionDisplay({
    solutionTextPreview,
    solutionImageUrl,
    solutionDiagramSvg,
  });

  if (display.kind === "text") {
    const normalized = displayPyqSolution(display.text, {
      contentTextNormalized,
      renderMode,
      sourceType,
    });
    const placements =
      solutionAssetPlacements && solutionAssetPlacements.length > 0
        ? solutionAssetPlacements
        : assetPlacements;
    return (
      <div className="solve-page__solution-text">
        <InlineAssetMarkdown
          text={normalized}
          questionId={questionId}
          assetPlacements={placements}
          diagramAlt={`Solution figure for question ${questionNo ?? questionId}`}
          preformatted
        />
      </div>
    );
  }

  if (display.kind === "svg") {
    return (
      <div className="solve-page__solution-text">
        <div
          className="variant-diagram__svg"
          dangerouslySetInnerHTML={{ __html: display.svg }}
        />
      </div>
    );
  }

  if (display.kind === "image") {
    return (
      <div className="practice-run-question__media solve-page__solution-media">
        <ZoomableImage
          src={cacheBustImageUrl(display.url, questionId)}
          alt={`Solution for question ${questionNo ?? questionId}`}
        />
      </div>
    );
  }

  return <p className="muted">{emptyMessage}</p>;
}

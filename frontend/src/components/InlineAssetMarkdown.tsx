import { type ReactNode } from "react";
import AiMarkdown from "./AiMarkdown";
import VariantDiagram from "./VariantDiagram";
import type { AssetPlacementView } from "../api";
import { resolveAssetUrl, resolveAssetSvgUrl, resolveAssetCompositeFallbackUrl, stemHasInlineAssets } from "../utils/questionRender";

type Props = {
  text: string;
  questionId: string;
  assetPlacements?: AssetPlacementView[];
  formatText?: (chunk: string) => string;
  markdownClass?: string;
  diagramClassName?: string;
  diagramAlt?: string;
  preformatted?: boolean;
  tailClassName?: (tail: string) => string | undefined;
};

const ASSET_PATTERN = /\{\{asset:(\d+)\}\}/g;

function renderChunks(
  text: string,
  questionId: string,
  assetPlacements: AssetPlacementView[] | undefined,
  formatText: (chunk: string) => string,
  markdownClass: string | undefined,
  diagramClassName: string,
  diagramAlt: string,
  preformatted: boolean,
  tailClassName?: (tail: string) => string | undefined
) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(ASSET_PATTERN.source, "g");
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <AiMarkdown
          key={`text-${lastIndex}`}
          text={formatText(text.slice(lastIndex, match.index))}
          className={markdownClass}
          preformatted={preformatted}
        />
      );
    }
    const assetIndex = Number(match[1]);
    const primary = resolveAssetUrl(assetIndex, assetPlacements, questionId);
    const svgFallback = resolveAssetSvgUrl(assetIndex, assetPlacements, questionId);
    const compositeFallback = resolveAssetCompositeFallbackUrl(
      assetIndex,
      assetPlacements,
      questionId
    );
    nodes.push(
      <VariantDiagram
        key={`asset-${match.index}`}
        imageUrl={primary}
        fallbackImageUrl={svgFallback}
        fallbackImageUrls={compositeFallback ? [compositeFallback] : []}
        svg=""
        alt={diagramAlt}
        className={diagramClassName}
      />
    );
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    const extraClass = tailClassName?.(tail);
    const markdown = (
      <AiMarkdown
        key={`text-${lastIndex}`}
        text={formatText(tail)}
        className={markdownClass}
        preformatted={preformatted}
      />
    );
    nodes.push(
      extraClass ? (
        <div key={`text-wrap-${lastIndex}`} className={extraClass}>
          {markdown}
        </div>
      ) : (
        markdown
      )
    );
  }
  return nodes;
}

export default function InlineAssetMarkdown({
  text,
  questionId,
  assetPlacements,
  formatText = (value) => value,
  markdownClass,
  diagramClassName = "text-mcq-paper__diagram text-mcq-paper__diagram--inline",
  diagramAlt = "Figure",
  preformatted = true,
  tailClassName,
}: Props) {
  if (!stemHasInlineAssets(text)) {
    return (
      <AiMarkdown
        text={formatText(text)}
        className={markdownClass}
        preformatted={preformatted}
      />
    );
  }
  return (
    <>
      {renderChunks(
        text,
        questionId,
        assetPlacements,
        formatText,
        markdownClass,
        diagramClassName,
        diagramAlt,
        preformatted,
        tailClassName
      )}
    </>
  );
}

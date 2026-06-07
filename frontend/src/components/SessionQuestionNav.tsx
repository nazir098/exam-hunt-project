import { useEffect, useMemo, useState } from "react";
import type { SessionQuestionTile } from "../api";

const STATUS_LABELS: Record<string, string> = {
  correct: "Correct",
  wrong: "Wrong",
  skipped: "Skipped",
  answered: "Answered",
  marked: "Marked for review",
  unattempted: "Unattempted",
  current: "Current",
};

const MOBILE_PREVIEW = 5;
const DESKTOP_PREVIEW = 10;
const DESKTOP_MQ = "(min-width: 768px)";

function tileLabel(tile: SessionQuestionTile, examMode: boolean, isMarked: boolean): string {
  if (examMode) {
    if (isMarked) return STATUS_LABELS.marked;
    if (tile.status === "correct" || tile.status === "wrong" || tile.status === "skipped") {
      return STATUS_LABELS.answered;
    }
  }
  return STATUS_LABELS[tile.status] ?? tile.status;
}

function tileTooltip(tile: SessionQuestionTile, examMode: boolean, isMarked: boolean): string {
  return `Q${tile.number} · ${tileLabel(tile, examMode, isMarked)}`;
}

function tileVisualStatus(tile: SessionQuestionTile, examMode: boolean, isMarked: boolean): string {
  if (examMode) {
    if (isMarked) return "marked";
    if (tile.status === "correct" || tile.status === "wrong" || tile.status === "skipped") return "answered";
    return tile.status;
  }
  if (isMarked) return "marked";
  return tile.status;
}

function isAnsweredTile(tile: SessionQuestionTile): boolean {
  return tile.status === "correct" || tile.status === "wrong" || tile.status === "skipped";
}

function previewCountForViewport(isDesktop: boolean): number {
  return isDesktop ? DESKTOP_PREVIEW : MOBILE_PREVIEW;
}

function visibleTileWindow(
  tiles: SessionQuestionTile[],
  activeQuestionId: string,
  expanded: boolean,
  previewCount: number
): SessionQuestionTile[] {
  if (expanded || tiles.length <= previewCount) return tiles;

  const activeIdx = tiles.findIndex((t) => t.questionId === activeQuestionId);
  if (activeIdx < 0) return tiles.slice(0, previewCount);

  let start = Math.max(0, activeIdx - Math.floor(previewCount / 2));
  let end = start + previewCount;
  if (end > tiles.length) {
    end = tiles.length;
    start = Math.max(0, end - previewCount);
  }
  return tiles.slice(start, end);
}

type Props = {
  tiles: SessionQuestionTile[];
  activeQuestionId: string;
  onSelect: (questionId: string) => void;
  showMarked?: boolean;
  markedIds?: string[];
  /** Hide correct/wrong/skipped styling during an active test. */
  examMode?: boolean;
};

export default function SessionQuestionNav({
  tiles,
  activeQuestionId,
  onSelect,
  showMarked = false,
  markedIds = [],
  examMode = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_MQ).matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const previewCount = previewCountForViewport(isDesktop);
  const canExpand = tiles.length > previewCount;
  const shownTiles = useMemo(
    () => visibleTileWindow(tiles, activeQuestionId, expanded, previewCount),
    [tiles, activeQuestionId, expanded, previewCount]
  );

  if (tiles.length === 0) return null;

  const activeTile = tiles.find((t) => t.questionId === activeQuestionId);
  const activeNumber = activeTile?.number ?? "?";
  const answeredCount = tiles.filter(isAnsweredTile).length;

  function renderTile(tile: SessionQuestionTile) {
    const isActive = tile.questionId === activeQuestionId;
    const isMarked = showMarked && markedIds.includes(tile.questionId);
    const visualStatus = tileVisualStatus(tile, examMode, isMarked);
    const showStatus = visualStatus === "marked" || isMarked ? showMarked || examMode : true;
    const statusClass =
      showStatus && visualStatus !== "current" && !isActive
        ? ` session-qnav__tile--${visualStatus}`
        : isMarked
          ? " session-qnav__tile--marked"
          : "";
    const activeClass = isActive || tile.status === "current" ? " session-qnav__tile--current" : "";
    const tooltip = tileTooltip(tile, examMode, isMarked);
    return (
      <button
        key={tile.questionId}
        type="button"
        className={`session-qnav__tile${statusClass}${activeClass}`}
        onClick={() => onSelect(tile.questionId)}
        title={tooltip}
        aria-label={tooltip}
        aria-current={isActive ? "step" : undefined}
      >
        Q{tile.number}
      </button>
    );
  }

  return (
    <nav
      className={[
        "session-qnav",
        expanded ? "session-qnav--expanded" : "session-qnav--preview",
        canExpand ? "session-qnav--expandable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Question navigation"
    >
      <div className="session-qnav__head">
        <span className="session-qnav__head-label">Questions</span>
        <span className="session-qnav__head-meta">
          Q{activeNumber} · {answeredCount}/{tiles.length}
        </span>
        {canExpand && (
          <button
            type="button"
            className="session-qnav__expand"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="session-qnav-grid"
          >
            {expanded ? "Show less" : `Show all (${tiles.length})`}
            <span className="material-symbols-outlined" aria-hidden>
              {expanded ? "expand_less" : "expand_more"}
            </span>
          </button>
        )}
      </div>
      <div id="session-qnav-grid" className="session-qnav__grid">
        {shownTiles.map(renderTile)}
      </div>
    </nav>
  );
}

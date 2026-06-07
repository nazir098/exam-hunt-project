import { useEffect, useMemo, useState } from "react";
import type { SessionQuestionTile } from "../api";

const STATUS_LABELS: Record<string, string> = {
  correct: "Correct",
  wrong: "Wrong",
  skipped: "Skipped",
  answered: "Answered",
  marked: "Marked for review",
  visited: "Visited",
  unattempted: "Not visited",
  current: "Current",
};

const MOBILE_PREVIEW = 5;
const DESKTOP_PREVIEW = 10;
const DESKTOP_MQ = "(min-width: 768px)";

function tileLabel(
  tile: SessionQuestionTile,
  examMode: boolean,
  flagged: boolean,
  visited: boolean
): string {
  if (examMode && isAnsweredTile(tile)) return STATUS_LABELS.answered;
  if (flagged) return STATUS_LABELS.marked;
  if (examMode && visited) return STATUS_LABELS.visited;
  return STATUS_LABELS[tile.status] ?? tile.status;
}

function tileTooltip(
  tile: SessionQuestionTile,
  examMode: boolean,
  flagged: boolean,
  visited: boolean
): string {
  return `Q${tile.number} · ${tileLabel(tile, examMode, flagged, visited)}`;
}

function examTileStatus(
  tile: SessionQuestionTile,
  flagged: boolean,
  visited: boolean
): string {
  if (isAnsweredTile(tile)) return "answered";
  if (flagged) return "marked";
  if (visited) return "visited";
  return "unattempted";
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
  /** Questions opened during test but not yet answered. */
  visitedIds?: string[];
  /** Hide correct/wrong/skipped styling during an active test. */
  examMode?: boolean;
  /** Result page copy: "Reviewed X of Y Questions". */
  resultOverview?: boolean;
};

export default function SessionQuestionNav({
  tiles,
  activeQuestionId,
  onSelect,
  showMarked = false,
  markedIds = [],
  visitedIds = [],
  examMode = false,
  resultOverview = false,
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
    const answered = isAnsweredTile(tile);
    const flagged = showMarked && markedIds.includes(tile.questionId) && !answered;
    const visited =
      examMode && visitedIds.includes(tile.questionId) && !answered && !flagged;
    const baseStatus = examMode ? examTileStatus(tile, flagged, visited) : tile.status;
    const statusClass = ` session-qnav__tile--${baseStatus}`;
    const activeClass = isActive ? " session-qnav__tile--current" : "";
    const tooltip = tileTooltip(tile, examMode, flagged, visited);
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
        <span className="session-qnav__head-label">
          {resultOverview ? "Question review" : "Questions"}
        </span>
        <span className="session-qnav__head-meta">
          {resultOverview
            ? `Reviewed ${answeredCount} of ${tiles.length} Questions`
            : `Q${activeNumber} · ${answeredCount}/${tiles.length}`}
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

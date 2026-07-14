import { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "../auth/storage";

export type NormBbox = [number, number, number, number];

type Edge = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

type Props = {
  open: boolean;
  imageUrl: string;
  title?: string;
  initialBbox?: number[] | null;
  busy?: boolean;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (bbox: NormBbox) => void;
};

const MIN_SIZE = 24;
const DEFAULT_BBOX: NormBbox = [200, 200, 800, 700];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeBbox(raw?: number[] | null): NormBbox {
  if (!raw || raw.length !== 4) return [...DEFAULT_BBOX];
  const x0 = clamp(Number(raw[0]) || 0, 0, 1000);
  const y0 = clamp(Number(raw[1]) || 0, 0, 1000);
  const x1 = clamp(Number(raw[2]) || 0, 0, 1000);
  const y1 = clamp(Number(raw[3]) || 0, 0, 1000);
  if (!(x0 < x1 && y0 < y1)) return [...DEFAULT_BBOX];
  return [x0, y0, x1, y1];
}

function isAdminProtectedUrl(url: string) {
  return url.startsWith("/api/admin/") || url.includes("/api/admin/extractor-files/");
}

export default function SourceImageCropDialog({
  open,
  imageUrl,
  title = "Crop from source image",
  initialBbox,
  busy = false,
  confirmLabel = "Save crop",
  onCancel,
  onConfirm,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [bbox, setBbox] = useState<NormBbox>(() => normalizeBbox(initialBbox));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [displaySrc, setDisplaySrc] = useState("");
  const [cacheKey] = useState(() => Date.now());
  const dragRef = useRef<{
    edge: Edge;
    startX: number;
    startY: number;
    startBbox: NormBbox;
    scaleX: number;
    scaleY: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setBbox(normalizeBbox(initialBbox));
    setReady(false);
    setLoadError("");
  }, [open, imageUrl, initialBbox]);

  // Admin extractor previews require Bearer — plain <img> cannot send Authorization.
  useEffect(() => {
    if (!open || !imageUrl) {
      setDisplaySrc("");
      return;
    }

    let revoked = "";
    let cancelled = false;

    if (!isAdminProtectedUrl(imageUrl)) {
      const sep = imageUrl.includes("?") ? "&" : "?";
      setDisplaySrc(`${imageUrl}${sep}_=${cacheKey}`);
      return;
    }

    const token = getToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    setDisplaySrc("");
    setLoadError("");
    fetch(imageUrl, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setDisplaySrc(revoked);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplaySrc("");
          setLoadError("Could not load source image. Check extractor files / login.");
        }
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open, imageUrl, cacheKey]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  const layoutBox = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.clientWidth || !img.clientHeight) return null;
    return {
      scaleX: img.clientWidth / 1000,
      scaleY: img.clientHeight / 1000,
      width: img.clientWidth,
      height: img.clientHeight,
    };
  }, []);

  const startDrag = useCallback(
    (edge: Edge, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const layout = layoutBox();
      if (!layout) return;
      dragRef.current = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startBbox: [...bbox],
        scaleX: layout.scaleX,
        scaleY: layout.scaleY,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [bbox, layoutBox]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / drag.scaleX;
    const dy = (e.clientY - drag.startY) / drag.scaleY;
    let [x0, y0, x1, y1] = drag.startBbox;

    switch (drag.edge) {
      case "move": {
        const w = x1 - x0;
        const h = y1 - y0;
        x0 = clamp(x0 + dx, 0, 1000 - w);
        y0 = clamp(y0 + dy, 0, 1000 - h);
        x1 = x0 + w;
        y1 = y0 + h;
        break;
      }
      case "n":
        y0 = clamp(y0 + dy, 0, y1 - MIN_SIZE);
        break;
      case "s":
        y1 = clamp(y1 + dy, y0 + MIN_SIZE, 1000);
        break;
      case "w":
        x0 = clamp(x0 + dx, 0, x1 - MIN_SIZE);
        break;
      case "e":
        x1 = clamp(x1 + dx, x0 + MIN_SIZE, 1000);
        break;
      case "nw":
        x0 = clamp(x0 + dx, 0, x1 - MIN_SIZE);
        y0 = clamp(y0 + dy, 0, y1 - MIN_SIZE);
        break;
      case "ne":
        x1 = clamp(x1 + dx, x0 + MIN_SIZE, 1000);
        y0 = clamp(y0 + dy, 0, y1 - MIN_SIZE);
        break;
      case "sw":
        x0 = clamp(x0 + dx, 0, x1 - MIN_SIZE);
        y1 = clamp(y1 + dy, y0 + MIN_SIZE, 1000);
        break;
      case "se":
        x1 = clamp(x1 + dx, x0 + MIN_SIZE, 1000);
        y1 = clamp(y1 + dy, y0 + MIN_SIZE, 1000);
        break;
    }
    setBbox([x0, y0, x1, y1]);
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  if (!open) return null;

  const layout = ready ? layoutBox() : null;
  const [x0, y0, x1, y1] = bbox;
  const left = layout ? x0 * layout.scaleX : 0;
  const top = layout ? y0 * layout.scaleY : 0;
  const width = layout ? (x1 - x0) * layout.scaleX : 0;
  const height = layout ? (y1 - y0) * layout.scaleY : 0;
  const stageW = layout?.width ?? 0;
  const stageH = layout?.height ?? 0;

  return (
    <div className="source-crop-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="source-crop-dialog__backdrop" onClick={() => !busy && onCancel()} />
      <div className="source-crop-dialog__panel">
        <header className="source-crop-dialog__head">
          <h3>{title}</h3>
          <p className="muted">Drag the box over the figure on the source crop, then save.</p>
        </header>
        <div
          className="source-crop-dialog__stage-wrap"
          ref={stageRef}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="source-crop-dialog__stage">
            {loadError ? (
              <p className="muted source-crop-dialog__error">{loadError}</p>
            ) : !displaySrc ? (
              <p className="muted">Loading source image…</p>
            ) : (
              <img
                ref={imgRef}
                src={displaySrc}
                alt="Source question crop"
                className="source-crop-dialog__img"
                draggable={false}
                onLoad={() => setReady(true)}
                onError={() => {
                  setReady(false);
                  setLoadError("Source image failed to display.");
                }}
              />
            )}
            {ready && layout ? (
              <div className="source-crop-dialog__overlay" style={{ width: stageW, height: stageH }}>
                <div
                  className="source-crop-dialog__shade"
                  style={{ left: 0, top: 0, width: stageW, height: top }}
                />
                <div
                  className="source-crop-dialog__shade"
                  style={{
                    left: 0,
                    top: top + height,
                    width: stageW,
                    height: Math.max(0, stageH - top - height),
                  }}
                />
                <div
                  className="source-crop-dialog__shade"
                  style={{ left: 0, top, width: left, height }}
                />
                <div
                  className="source-crop-dialog__shade"
                  style={{
                    left: left + width,
                    top,
                    width: Math.max(0, stageW - left - width),
                    height,
                  }}
                />
                <div
                  className="source-crop-dialog__box"
                  style={{ left, top, width, height }}
                  onPointerDown={(e) => startDrag("move", e)}
                >
                  {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Edge[]).map((edge) => (
                    <span
                      key={edge}
                      className={`source-crop-dialog__handle source-crop-dialog__handle--${edge}`}
                      onPointerDown={(e) => startDrag(edge, e)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <footer className="source-crop-dialog__actions">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm primary"
            disabled={busy || !ready}
            onClick={() => onConfirm(bbox)}
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

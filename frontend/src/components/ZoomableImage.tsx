import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_ZOOM = 2;

function touchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function fitImageSize(naturalWidth: number, naturalHeight: number) {
  const maxW = Math.min(window.innerWidth * 0.96, 42 * 16);
  const maxH = window.innerHeight - 96;
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxW, height: maxH };
  }
  const ratio = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
  return {
    width: Math.round(naturalWidth * ratio),
    height: Math.round(naturalHeight * ratio),
  };
}

export default function ZoomableImage({ src, alt, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [fittedSize, setFittedSize] = useState({ width: 0, height: 0 });

  const scaleRef = useRef(scale);
  const pinchStart = useRef({ distance: 0, scale: 1 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  const panRef = useRef({
    active: false,
    pointerId: -1,
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const centerViewport = useCallback(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, (stage.offsetWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (stage.offsetHeight - viewport.clientHeight) / 2);
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setScale(1);
    panRef.current.active = false;
  }, []);

  const openLightbox = useCallback(() => {
    setScale(1);
    setFittedSize({ width: 0, height: 0 });
    setOpen(true);
  }, []);

  const toggleDoubleTapZoom = useCallback(() => {
    setScale((current) => (current > 1 ? 1 : DOUBLE_TAP_ZOOM));
  }, []);

  const onLightboxImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setFittedSize(fitImageSize(img.naturalWidth, img.naturalHeight));
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    html.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      html.style.overflow = prev.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open || scale <= 1) return;
    centerViewport();
  }, [open, scale, fittedSize, centerViewport]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!open || !viewport) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        panRef.current.active = false;
        pinchStart.current = {
          distance: touchDistance(e.touches),
          scale: scaleRef.current,
        };
        return;
      }

      if (e.touches.length === 1 && scaleRef.current > 1) {
        panRef.current = {
          active: true,
          pointerId: e.touches[0].identifier,
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          scrollLeft: viewport.scrollLeft,
          scrollTop: viewport.scrollTop,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const distance = touchDistance(e.touches);
        if (pinchStart.current.distance <= 0) return;
        const ratio = distance / pinchStart.current.distance;
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.current.scale * ratio));
        setScale(next);
        return;
      }

      if (
        e.touches.length === 1 &&
        panRef.current.active &&
        scaleRef.current > 1 &&
        e.touches[0].identifier === panRef.current.pointerId
      ) {
        e.preventDefault();
        const touch = e.touches[0];
        viewport.scrollLeft =
          panRef.current.scrollLeft - (touch.clientX - panRef.current.x);
        viewport.scrollTop = panRef.current.scrollTop - (touch.clientY - panRef.current.y);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStart.current = { distance: 0, scale: scaleRef.current };
      }
      if (e.touches.length === 0) {
        panRef.current.active = false;
      }

      if (e.changedTouches.length !== 1 || e.touches.length > 0) return;

      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        e.preventDefault();
        toggleDoubleTapZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (scaleRef.current <= 1 || e.pointerType === "touch") return;
      if (e.button !== 0) return;
      panRef.current = {
        active: true,
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
      viewport.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panRef.current.active || e.pointerId !== panRef.current.pointerId) return;
      if (scaleRef.current <= 1) return;
      e.preventDefault();
      viewport.scrollLeft = panRef.current.scrollLeft - (e.clientX - panRef.current.x);
      viewport.scrollTop = panRef.current.scrollTop - (e.clientY - panRef.current.y);
    };

    const endPan = (e: PointerEvent) => {
      if (e.pointerId !== panRef.current.pointerId) return;
      panRef.current.active = false;
      if (viewport.hasPointerCapture(e.pointerId)) {
        viewport.releasePointerCapture(e.pointerId);
      }
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endPan);
    viewport.addEventListener("pointercancel", endPan);

    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", endPan);
      viewport.removeEventListener("pointercancel", endPan);
    };
  }, [open, toggleDoubleTapZoom]);

  const displayWidth = fittedSize.width > 0 ? Math.round(fittedSize.width * scale) : undefined;
  const displayHeight = fittedSize.height > 0 ? Math.round(fittedSize.height * scale) : undefined;

  const lightbox =
    open &&
    createPortal(
      <div
        className="image-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        onClick={close}
      >
        <button
          type="button"
          className="image-lightbox__close"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          aria-label="Close enlarged image"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div
          ref={viewportRef}
          className="image-lightbox__viewport"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={stageRef}
            className="image-lightbox__stage"
            style={
              displayWidth && displayHeight
                ? {
                    width: `max(100%, ${displayWidth}px)`,
                    height: `max(100%, ${displayHeight}px)`,
                  }
                : undefined
            }
          >
            <img
              className="image-lightbox__img"
              src={src}
              alt={alt}
              draggable={false}
              onLoad={onLightboxImageLoad}
              onDoubleClick={toggleDoubleTapZoom}
              style={
                displayWidth && displayHeight
                  ? {
                      width: displayWidth,
                      height: displayHeight,
                      maxWidth: "none",
                      maxHeight: "none",
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        className={`zoomable-image${className ? ` ${className}` : ""}`}
        onClick={openLightbox}
        aria-label={`${alt} — tap to enlarge`}
      >
        <img src={src} alt={alt} draggable={false} />
      </button>
      {lightbox}
    </>
  );
}

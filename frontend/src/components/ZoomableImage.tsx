import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

type FitSize = { w: number; h: number };

const MOBILE_MQ = "(max-width: 639px)";
const MIN_SCALE = 0.75;
const MAX_SCALE = 4;

function touchDistance(touches: React.TouchList | TouchList): number {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches;
}

function viewportBounds() {
  return {
    w: Math.max(240, window.innerWidth - 32),
    h: Math.max(240, window.innerHeight - 100),
  };
}

function fitContain(naturalW: number, naturalH: number, maxW: number, maxH: number): FitSize {
  if (naturalW <= 0 || naturalH <= 0) return { w: 0, h: 0 };
  let w = naturalW;
  let h = naturalH;
  if (w > maxW) {
    h *= maxW / w;
    w = maxW;
  }
  if (h > maxH) {
    w *= maxH / h;
    h = maxH;
  }
  return { w, h };
}

function initialMobileScale(base: FitSize, maxW: number) {
  if (base.w <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(1, maxW / base.w));
}

export default function ZoomableImage({ src, alt, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [baseSize, setBaseSize] = useState<FitSize | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pinchStart = useRef({ distance: 0, scale: 1 });
  const scaleRef = useRef(scale);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const applyImageMetrics = useCallback((img: HTMLImageElement) => {
    const { w: maxW, h: maxH } = viewportBounds();
    const base = fitContain(img.naturalWidth, img.naturalHeight, maxW, maxH);
    if (base.w <= 0 || base.h <= 0) return;
    setBaseSize(base);
    setScale(isMobileViewport() ? initialMobileScale(base, maxW) : 1);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setScale(1);
    setBaseSize(null);
  }, []);

  const openLightbox = useCallback(() => {
    setScale(1);
    setBaseSize(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const img = imgRef.current;
    if (!img) return;

    const syncMetrics = () => applyImageMetrics(img);

    if (img.complete && img.naturalWidth > 0) {
      syncMetrics();
    } else {
      img.addEventListener("load", syncMetrics);
      return () => img.removeEventListener("load", syncMetrics);
    }
  }, [applyImageMetrics, open, src]);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStart.current = {
        distance: touchDistance(e.touches),
        scale: scaleRef.current,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const distance = touchDistance(e.touches);
    if (pinchStart.current.distance <= 0) return;
    const ratio = distance / pinchStart.current.distance;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.current.scale * ratio));
    setScale(next);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      pinchStart.current = { distance: 0, scale: scaleRef.current };
    }
  }

  function onDoubleClick() {
    setScale((s) => (s > 1 ? 1 : 1.75));
  }

  const displayW = baseSize ? baseSize.w * scale : undefined;
  const displayH = baseSize ? baseSize.h * scale : undefined;

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

      {open && (
        <div
          className={`image-lightbox${isMobileViewport() ? " image-lightbox--mobile" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={close}
        >
          <div className="image-lightbox__inner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="image-lightbox__close"
              onClick={close}
              aria-label="Close enlarged image"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div
              className="image-lightbox__viewport"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onDoubleClick={onDoubleClick}
            >
              <img
                ref={imgRef}
                className={`image-lightbox__img${baseSize ? " is-sized" : ""}`}
                src={src}
                alt={alt}
                draggable={false}
                style={
                  displayW && displayH
                    ? {
                        width: displayW,
                        height: displayH,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

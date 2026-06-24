import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

const MIN_SCALE = 0.75;
const MAX_SCALE = 4;

function touchDistance(touches: React.TouchList | TouchList): number {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function ZoomableImage({ src, alt, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const pinchStart = useRef({ distance: 0, scale: 1 });
  const scaleRef = useRef(scale);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const close = useCallback(() => {
    setOpen(false);
    setScale(1);
  }, []);

  const openLightbox = useCallback(() => {
    setScale(1);
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
            <div className="image-lightbox__frame">
              <img
                className="image-lightbox__img"
                src={src}
                alt={alt}
                draggable={false}
                style={
                  scale !== 1
                    ? { transform: `scale(${scale})`, transformOrigin: "top center" }
                    : undefined
                }
              />
            </div>
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

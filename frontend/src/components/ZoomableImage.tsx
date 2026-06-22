import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

function touchDistance(touches: React.TouchList | TouchList): number {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export default function ZoomableImage({ src, alt, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [pinchScale, setPinchScale] = useState(1);
  const pinchStart = useRef({ distance: 0, scale: 1 });

  const close = useCallback(() => {
    setOpen(false);
    setPinchScale(1);
  }, []);

  const openLightbox = useCallback(() => {
    setPinchScale(1);
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
        scale: pinchScale,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const distance = touchDistance(e.touches);
    if (pinchStart.current.distance <= 0) return;
    const ratio = distance / pinchStart.current.distance;
    const next = Math.min(4, Math.max(0.75, pinchStart.current.scale * ratio));
    setPinchScale(next);
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      pinchStart.current = { distance: 0, scale: 1 };
    }
  }

  function onDoubleClick() {
    setPinchScale((s) => (s > 1 ? 1 : 1.75));
  }

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
              <img
                className="image-lightbox__img"
                src={src}
                alt={alt}
                draggable={false}
                style={pinchScale !== 1 ? { transform: `scale(${pinchScale})` } : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useCallback, useEffect, useState } from "react";

type Props = {
  imageUrl?: string;
  fallbackImageUrl?: string;
  svg?: string;
  alt: string;
  className?: string;
};

export default function VariantDiagram({
  imageUrl,
  fallbackImageUrl = "",
  svg,
  alt,
  className = "",
}: Props) {
  const primary = imageUrl?.trim() ?? "";
  const fallback = fallbackImageUrl?.trim() ?? "";
  const [src, setSrc] = useState(primary || fallback);
  const markup = svg?.trim();
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setSrc(primary || fallback);
  }, [primary, fallback]);

  const openZoom = useCallback(() => {
    if (src) setZoomed(true);
  }, [src]);

  const handleError = useCallback(() => {
    if (fallback && src !== fallback) {
      setSrc(fallback);
      return;
    }
    // Hide broken-image icon when CDN asset 404s after metadata sync.
    setSrc("");
  }, [fallback, src]);

  if (!src && !markup) return null;

  return (
    <>
      <figure
        className={`variant-diagram${className ? ` ${className}` : ""}${src ? " variant-diagram--zoomable" : ""}`}
        onClick={openZoom}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openZoom();
          }
        }}
        tabIndex={src ? 0 : undefined}
        role={src ? "button" : undefined}
        aria-label={src ? `${alt} — tap to zoom` : undefined}
      >
        {src ? (
          <>
            <img
              className="variant-diagram__img"
              src={src}
              alt={alt}
              draggable={false}
              loading="lazy"
              decoding="async"
              onError={handleError}
            />
            <span className="variant-diagram__zoom-hint">
              <span className="material-symbols-outlined" aria-hidden>zoom_in</span>
              Tap to zoom
            </span>
          </>
        ) : (
          <div
            className="variant-diagram__svg"
            role="img"
            aria-label={alt}
            dangerouslySetInnerHTML={{ __html: markup ?? "" }}
          />
        )}
      </figure>

      {zoomed && src && (
        <div
          className="variant-diagram-modal"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setZoomed(false)}
        >
          <div
            className="variant-diagram-modal__inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="variant-diagram-modal__close"
              onClick={() => setZoomed(false)}
              aria-label="Close zoomed image"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img
              className="variant-diagram-modal__img"
              src={src}
              alt={alt}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  imageUrl?: string;
  fallbackImageUrl?: string;
  /** Extra fallbacks tried in order after fallbackImageUrl (e.g. composite question image). */
  fallbackImageUrls?: string[];
  svg?: string;
  alt: string;
  className?: string;
};

export default function VariantDiagram({
  imageUrl,
  fallbackImageUrl = "",
  fallbackImageUrls = [],
  svg,
  alt,
  className = "",
}: Props) {
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of [imageUrl, fallbackImageUrl, ...fallbackImageUrls]) {
      const value = raw?.trim() ?? "";
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(value);
    }
    return out;
  }, [imageUrl, fallbackImageUrl, fallbackImageUrls]);

  const [index, setIndex] = useState(0);
  const src = candidates[index] ?? "";
  const markup = svg?.trim();
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const openZoom = useCallback(() => {
    if (src) setZoomed(true);
  }, [src]);

  const handleError = useCallback(() => {
    setIndex((i) => {
      if (i + 1 < candidates.length) return i + 1;
      return candidates.length; // past end → hide
    });
  }, [candidates.length]);

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
              <span className="material-symbols-outlined" aria-hidden>
                zoom_in
              </span>
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

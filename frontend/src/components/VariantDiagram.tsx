import { useCallback, useState } from "react";

type Props = {
  imageUrl?: string;
  svg?: string;
  alt: string;
  className?: string;
};

export default function VariantDiagram({ imageUrl, svg, alt, className = "" }: Props) {
  const url = imageUrl?.trim();
  const markup = svg?.trim();
  const [zoomed, setZoomed] = useState(false);

  const openZoom = useCallback(() => {
    if (url) setZoomed(true);
  }, [url]);

  if (!url && !markup) return null;

  return (
    <>
      <figure
        className={`variant-diagram${className ? ` ${className}` : ""}${url ? " variant-diagram--zoomable" : ""}`}
        onClick={openZoom}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openZoom();
          }
        }}
        tabIndex={url ? 0 : undefined}
        role={url ? "button" : undefined}
        aria-label={url ? `${alt} — tap to zoom` : undefined}
      >
        {url ? (
          <>
            <img className="variant-diagram__img" src={url} alt={alt} draggable={false} />
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

      {zoomed && url && (
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
              src={url}
              alt={alt}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}

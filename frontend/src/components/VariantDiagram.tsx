import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "../auth/storage";

type Props = {
  imageUrl?: string;
  fallbackImageUrl?: string;
  /** Extra fallbacks tried in order after fallbackImageUrl (e.g. composite question image). */
  fallbackImageUrls?: string[];
  svg?: string;
  alt: string;
  className?: string;
};

function isAdminProtectedUrl(url: string) {
  return url.startsWith("/api/admin/") || url.includes("/api/admin/extractor-files/");
}

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
  const rawSrc = candidates[index] ?? "";
  const [displaySrc, setDisplaySrc] = useState("");
  const markup = svg?.trim();
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  useEffect(() => {
    let revoked = "";
    let cancelled = false;

    if (!rawSrc) {
      setDisplaySrc("");
      return;
    }

    if (!isAdminProtectedUrl(rawSrc)) {
      setDisplaySrc(rawSrc);
      return;
    }

    const token = getToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    setDisplaySrc("");
    fetch(rawSrc, { headers })
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
          setIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length));
        }
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [rawSrc, candidates.length]);

  const openZoom = useCallback(() => {
    if (displaySrc) setZoomed(true);
  }, [displaySrc]);

  const handleError = useCallback(() => {
    setIndex((i) => {
      if (i + 1 < candidates.length) return i + 1;
      return candidates.length; // past end → hide
    });
  }, [candidates.length]);

  if (!displaySrc && !markup) return null;

  return (
    <>
      <figure
        className={`variant-diagram${className ? ` ${className}` : ""}${
          displaySrc ? " variant-diagram--zoomable" : ""
        }`}
        onClick={openZoom}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openZoom();
          }
        }}
        tabIndex={displaySrc ? 0 : undefined}
        role={displaySrc ? "button" : undefined}
        aria-label={displaySrc ? `${alt} — tap to zoom` : undefined}
      >
        {displaySrc ? (
          <>
            <img
              className="variant-diagram__img"
              src={displaySrc}
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

      {zoomed && displaySrc && (
        <div
          className="variant-diagram-modal"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setZoomed(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setZoomed(false);
          }}
        >
          <button
            type="button"
            className="variant-diagram-modal__close"
            aria-label="Close zoom"
            onClick={() => setZoomed(false)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
          <img className="variant-diagram-modal__img" src={displaySrc} alt={alt} draggable={false} />
        </div>
      )}
    </>
  );
}

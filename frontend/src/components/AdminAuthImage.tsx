import { useEffect, useState } from "react";
import { getToken } from "../auth/storage";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Loads admin-protected image URLs (Bearer) so newly cropped local extractor files preview correctly.
 */
export default function AdminAuthImage({ src, alt, className }: Props) {
  const [displaySrc, setDisplaySrc] = useState(src.startsWith("/api/admin/") ? "" : src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = "";
    let cancelled = false;
    setFailed(false);

    if (!src) {
      setDisplaySrc("");
      return;
    }

    if (!src.startsWith("/api/admin/")) {
      setDisplaySrc(src);
      return;
    }

    const token = getToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    setDisplaySrc("");
    fetch(src, { headers })
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
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  if (failed || !src) {
    return <p className="muted admin-content-qc__asset-missing">Image missing — use Crop from source</p>;
  }
  if (!displaySrc) {
    return <p className="muted admin-content-qc__asset-missing">Loading preview…</p>;
  }
  return <img src={displaySrc} alt={alt} className={className} loading="lazy" />;
}

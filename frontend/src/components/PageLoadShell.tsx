import { ReactNode } from "react";
import { Link } from "react-router-dom";
import AppLoader, { type AppLoaderMode } from "./AppLoader";

type Props = {
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  loaderLabel?: string;
  loaderHint?: string;
  loaderIcon?: string;
  loaderMode?: AppLoaderMode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  children: ReactNode;
};

export default function PageLoadShell({
  loading = false,
  error = "",
  onRetry,
  loaderLabel = "Loading…",
  loaderHint,
  loaderIcon,
  loaderMode = "default",
  backHref,
  backLabel = "Go back",
  className = "",
  children,
}: Props) {
  if (loading && !error) {
    return (
      <main className={`page-load-shell page-load-shell--loading${className ? ` ${className}` : ""}`}>
        <section className="glass-card content-loader-panel">
          <AppLoader
            variant="inline"
            label={loaderLabel}
            hint={loaderHint}
            icon={loaderIcon}
            mode={loaderMode}
          />
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={`page-load-shell page-load-shell--error${className ? ` ${className}` : ""}`}>
        <section className="glass-card page-load-shell__card" aria-live="polite">
          <div className="page-load-shell__icon-wrap" aria-hidden="true">
            <span className="material-symbols-outlined">cloud_off</span>
          </div>
          <h1 className="page-load-shell__title">Couldn&apos;t load this page</h1>
          <p className="page-load-shell__message">{error}</p>
          <div className="page-load-shell__actions">
            {onRetry && (
              <button type="button" className="btn primary" onClick={onRetry}>
                <span className="material-symbols-outlined">refresh</span>
                Try again
              </button>
            )}
            {backHref && (
              <Link to={backHref} className="btn">
                {backLabel}
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

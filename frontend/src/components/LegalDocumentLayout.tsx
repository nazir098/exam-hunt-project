import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_LAST_UPDATED, SUPPORT_EMAIL } from "../constants/legal";
import { BRAND_WITH_OWNER } from "../design/stitchAssets";

type Props = {
  title: string;
  children: ReactNode;
};

export default function LegalDocumentLayout({ title, children }: Props) {
  return (
    <main className="legal-page pt-4 lg:pt-8 pb-10">
      <article className="legal-page__card glass-card">
        <header className="legal-page__head">
          <p className="legal-page__eyebrow muted">{BRAND_WITH_OWNER}</p>
          <h1 className="legal-page__title">{title}</h1>
          <p className="legal-page__meta muted">Last updated: {LEGAL_LAST_UPDATED}</p>
        </header>
        <div className="legal-page__body">{children}</div>
        <footer className="legal-page__foot">
          <p className="muted">
            Questions?{" "}
            <a className="legal-page__link" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="legal-page__nav muted">
            <Link to="/privacy">Privacy</Link>
            <span aria-hidden> · </span>
            <Link to="/terms">Terms</Link>
            <span aria-hidden> · </span>
            <Link to="/">Home</Link>
          </p>
        </footer>
      </article>
    </main>
  );
}

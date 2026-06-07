import { forwardRef, useEffect, useRef, useState } from "react";
import type { QuestionPublic } from "../api";
import QuestionCard from "./QuestionCard";

/** Questions loaded per page from the API. */
export const BANK_PAGE_SIZE = 10;
/** Questions visible in the scroll viewport before the user scrolls. */
export const BANK_VISIBLE_SLOTS = 5;

type Props = {
  questions: QuestionPublic[];
  packId: string;
  page: number;
  totalPages: number;
  totalElements: number;
  packLabel?: string;
  filterCount?: number;
  loading?: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
};

const BankResultsFeed = forwardRef<HTMLElement, Props>(function BankResultsFeed(
  {
    questions,
    packId,
    page,
    totalPages,
    totalElements,
    packLabel,
    filterCount = 0,
    loading = false,
    onNextPage,
    onPrevPage,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const pageSize = BANK_PAGE_SIZE;
  const hasNext = page + 1 < totalPages;
  const hasPrev = page > 0;
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);
  const nextCount = Math.min(pageSize, Math.max(0, totalElements - to));
  const inPageCount = questions.length;
  const hasMoreInPage = inPageCount > BANK_VISIBLE_SLOTS;
  const remainingInPage = Math.max(0, inPageCount - BANK_VISIBLE_SLOTS);

  useEffect(() => {
    setReachedEnd(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [page, packId, questions.length]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || questions.length === 0) {
      setReachedEnd(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setReachedEnd(entry.isIntersecting),
      { root, threshold: 0.6, rootMargin: "0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [questions, page]);

  if (questions.length === 0) {
    return null;
  }

  return (
    <section
      ref={ref}
      id="bank-results"
      className="bank-results-feed bank-results-anchor"
      aria-label="Question results"
    >
      <div className="bank-results-feed__chrome">
        <p className="bank-results-feed__caption">
          Showing{" "}
          <strong>
            {from.toLocaleString()}–{to.toLocaleString()}
          </strong>{" "}
          of {totalElements.toLocaleString()} questions
          {packLabel && (
            <>
              <span className="bank-results-feed__caption-sep" aria-hidden>
                {" "}
                |{" "}
              </span>
              {packLabel}
            </>
          )}
          {filterCount > 0 && (
            <span className="bank-results-feed__caption-muted">
              {" "}
              · {filterCount} filter{filterCount === 1 ? "" : "s"}
            </span>
          )}
        </p>
      </div>

      <div className="bank-results-feed__scroll custom-scrollbar" ref={scrollRef}>
        <div className="bank-results-feed__list">
          {questions.map((q) => (
            <QuestionCard key={q.questionId} question={q} packId={packId} />
          ))}
        </div>
        <div ref={sentinelRef} className="bank-results-feed__sentinel" aria-hidden />

        {!reachedEnd && hasMoreInPage && (
          <div className="bank-results-feed__scroll-hint" aria-hidden>
            <span className="material-symbols-outlined">south</span>
            <span>Scroll for {remainingInPage} more questions</span>
          </div>
        )}
      </div>

      {reachedEnd && (
        <footer className="bank-results-feed__footer">
          <p className="bank-results-feed__meta">
            Viewed <strong>{from.toLocaleString()}–{to.toLocaleString()}</strong> of{" "}
            {totalElements.toLocaleString()}
            {totalPages > 1 && (
              <>
                {" "}
                · Set {page + 1} of {totalPages}
              </>
            )}
          </p>

          {hasNext ? (
            <button
              type="button"
              className="bank-results-feed__next"
              disabled={loading}
              onClick={onNextPage}
            >
              <span>Next {nextCount} questions</span>
              <span className="material-symbols-outlined" aria-hidden>
                arrow_forward
              </span>
            </button>
          ) : (
            <p className="bank-results-feed__done">You&apos;ve reached the end of this list.</p>
          )}

          {hasPrev && (
            <button
              type="button"
              className="bank-results-feed__prev"
              disabled={loading}
              onClick={onPrevPage}
            >
              <span className="material-symbols-outlined" aria-hidden>
                arrow_back
              </span>
              Previous set
            </button>
          )}
        </footer>
      )}
    </section>
  );
});

export default BankResultsFeed;

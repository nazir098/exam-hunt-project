import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { fetchBookmarkStatusBatch, type QuestionPublic } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import QuestionCard from "./QuestionCard";

/** Questions loaded per page from the API. */
export const BANK_PAGE_SIZE = 5;
/** Questions visible in the scroll viewport before the user scrolls. */
export const BANK_VISIBLE_SLOTS = 3;

type Props = {
  questions: QuestionPublic[];
  packId: string;
  page: number;
  totalPages: number;
  totalElements: number;
  packLabel?: string;
  filterCount?: number;
  loading?: boolean;
  sessionSize?: number;
  estMinutes?: number;
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
    loading = false,
    sessionSize,
    estMinutes,
    onNextPage,
    onPrevPage,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [bookmarkMap, setBookmarkMap] = useState<Record<string, boolean>>({});

  const pageSize = BANK_PAGE_SIZE;
  const hasNext = page + 1 < totalPages;
  const hasPrev = page > 0;
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);
  const nextCount = Math.min(pageSize, Math.max(0, totalElements - to));
  const inPageCount = questions.length;
  const hasMoreInPage = inPageCount > BANK_VISIBLE_SLOTS;
  const remainingInPage = Math.max(0, inPageCount - BANK_VISIBLE_SLOTS);

  const [nestedScroll, setNestedScroll] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setNestedScroll(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!nestedScroll) return;
    setReachedEnd(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [page, packId, questions.length, nestedScroll]);

  useEffect(() => {
    const root = nestedScroll ? scrollRef.current : null;
    const sentinel = sentinelRef.current;
    if (!sentinel || questions.length === 0) {
      setReachedEnd(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setReachedEnd(entry.isIntersecting),
      { root, threshold: nestedScroll ? 0.6 : 0.15, rootMargin: nestedScroll ? "0px" : "0px 0px 120px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [questions, page, nestedScroll]);

  useEffect(() => {
    if (!user || !settings.bookmarksEnabled || questions.length === 0) {
      setBookmarkMap({});
      return;
    }
    let cancelled = false;
    const ids = questions.map((q) => q.questionId);
    fetchBookmarkStatusBatch(ids)
      .then((map) => {
        if (!cancelled) setBookmarkMap(map);
      })
      .catch(() => {
        if (!cancelled) setBookmarkMap({});
      });
    return () => {
      cancelled = true;
    };
  }, [user, settings.bookmarksEnabled, questions]);

  const onBookmarkChange = useCallback((questionId: string, saved: boolean) => {
    setBookmarkMap((prev) => ({ ...prev, [questionId]: saved }));
  }, []);

  const bookmarkBatch = Boolean(user && settings.bookmarksEnabled);

  if (questions.length === 0) {
    return null;
  }

  const compactFeed = nestedScroll && inPageCount < BANK_VISIBLE_SLOTS;

  return (
    <section
      ref={ref}
      id="bank-results"
      className={`bank-results-feed bank-results-anchor${nestedScroll ? " bank-results-feed--nested" : " bank-results-feed--flat"}${compactFeed ? " bank-results-feed--compact" : ""}`}
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
        </p>
        {sessionSize != null && estMinutes != null && (
          <p className="bank-results-feed__session-note">
            Session will use current filters: <strong>{sessionSize} questions</strong> · ~{estMinutes} min
          </p>
        )}
      </div>

      <div className="bank-results-feed__scroll custom-scrollbar" ref={scrollRef}>
        <div className="bank-results-feed__list">
          {questions.map((q) => (
            <QuestionCard
              key={q.questionId}
              question={q}
              packId={packId}
              bookmarkSaved={bookmarkMap[q.questionId]}
              onBookmarkChange={(saved) => onBookmarkChange(q.questionId, saved)}
              bookmarkBatchStatus={bookmarkBatch}
            />
          ))}
        </div>
        <div ref={sentinelRef} className="bank-results-feed__sentinel" aria-hidden />

        {!reachedEnd && nestedScroll && hasMoreInPage && (
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

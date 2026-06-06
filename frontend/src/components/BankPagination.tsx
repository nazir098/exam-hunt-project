type Props = {
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

const PAGE_SIZE_OPTIONS = [12, 24, 48, 100] as const;

export default function BankPagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
}: Props) {
  if (totalPages <= 0) return null;

  const pageCount = Math.max(1, totalPages);
  const canGoPrev = page > 0 && !loading;
  const canGoNext = !loading && page + 1 < totalPages;
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);

  return (
    <nav className="bank-pagination" aria-label="Question bank pages">
      <div className="bank-pagination__size">
        <label className="bank-pagination__size-label" htmlFor="bank-page-size">
          Per page
        </label>
        <select
          id="bank-page-size"
          className="bank-pagination__size-select"
          value={pageSize}
          disabled={loading}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="bank-pagination__controls">
        <button
          type="button"
          className="bank-pagination__btn"
          disabled={!canGoPrev}
          onClick={() => onPageChange(0)}
          aria-label="First page"
        >
          First
        </button>
        <button
          type="button"
          className="bank-pagination__btn"
          disabled={!canGoPrev}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="bank-pagination__info">
          Page {page + 1} of {pageCount}
          {totalElements > 0 && (
            <span className="bank-pagination__range">
              · {from.toLocaleString()}–{to.toLocaleString()} of {totalElements.toLocaleString()}
            </span>
          )}
        </span>
        <button
          type="button"
          className="bank-pagination__btn"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
        <button
          type="button"
          className="bank-pagination__btn"
          disabled={!canGoNext}
          onClick={() => onPageChange(pageCount - 1)}
          aria-label="Last page"
        >
          Last
        </button>
      </div>
    </nav>
  );
}

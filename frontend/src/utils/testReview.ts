import type { SessionQuestionReview, SessionQuestionTile } from "../api";

export type TestReviewFilter = "all" | "wrong" | "correct" | "skipped" | "unanswered";

export type RetakeTestFilter = "wrong" | "skipped" | "unanswered" | "mistakes";

export function reviewFilterToRetakeFilter(filter: TestReviewFilter): RetakeTestFilter | null {
  if (filter === "wrong" || filter === "skipped" || filter === "unanswered") {
    return filter;
  }
  return null;
}

export const TEST_REVIEW_FILTERS: {
  id: TestReviewFilter;
  label: string;
  hint: string;
}[] = [
  { id: "wrong", label: "Wrong", hint: "Mistakes — your answer vs correct" },
  { id: "correct", label: "Correct", hint: "Confirm what you got right" },
  { id: "skipped", label: "Skipped", hint: "Questions you skipped during the test" },
  { id: "unanswered", label: "Unanswered", hint: "Left blank when you submitted" },
  { id: "all", label: "All", hint: "Every question in this test" },
];

export function reviewMatchesFilter(review: SessionQuestionReview, filter: TestReviewFilter): boolean {
  switch (filter) {
    case "wrong":
      return review.status === "wrong";
    case "correct":
      return review.status === "correct";
    case "skipped":
      return review.status === "skipped";
    case "unanswered":
      return review.status === "unattempted";
    case "all":
      return true;
    default:
      return true;
  }
}

export function filterReviews(
  reviews: SessionQuestionReview[],
  filter: TestReviewFilter
): SessionQuestionReview[] {
  return reviews.filter((r) => reviewMatchesFilter(r, filter));
}

export function filterTiles(tiles: SessionQuestionTile[], reviews: SessionQuestionReview[], filter: TestReviewFilter): SessionQuestionTile[] {
  const ids = new Set(filterReviews(reviews, filter).map((r) => r.questionId));
  return tiles.filter((t) => ids.has(t.questionId));
}

export function reviewFilterCount(reviews: SessionQuestionReview[], filter: TestReviewFilter): number {
  return filterReviews(reviews, filter).length;
}

export function parseReviewFilter(raw: string | null): TestReviewFilter {
  if (
    raw === "wrong" ||
    raw === "correct" ||
    raw === "skipped" ||
    raw === "unanswered" ||
    raw === "all"
  ) {
    return raw;
  }
  return "wrong";
}

export function optionLabel(value: string): string {
  return `Option ${value}`;
}

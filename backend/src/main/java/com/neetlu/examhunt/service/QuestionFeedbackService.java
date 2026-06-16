package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.model.QuestionRating;
import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.repository.QuestionRatingRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import com.neetlu.examhunt.repository.UserAccountRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class QuestionFeedbackService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "general", "wrong_answer", "typo", "image_issue", "ai_variant", "other");

    private final QuestionRatingRepository ratings;
    private final QuestionRepository questions;
    private final UserAccountRepository users;

    public QuestionFeedbackService(
            QuestionRatingRepository ratings,
            QuestionRepository questions,
            UserAccountRepository users) {
        this.ratings = ratings;
        this.questions = questions;
        this.users = users;
    }

    public FeedbackView submitFeedback(
            String userId, String questionId, int score, String comment, String category, String context) {
        requireQuestion(questionId);
        int normalizedScore = normalizeScore(score);
        String trimmedComment = comment == null ? "" : comment.trim();
        String normalizedCategory = normalizeCategory(category);
        String normalizedContext = normalizeContext(context);

        if (normalizedScore < 1 && trimmedComment.length() < 3) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Add a star rating or write at least 3 characters of feedback");
        }
        if (normalizedScore > 0 && (normalizedScore < 1 || normalizedScore > 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be 1–5");
        }

        QuestionRating rating = ratings.findByUserIdAndQuestionId(userId, questionId)
                .orElseGet(QuestionRating::new);
        rating.setUserId(userId);
        rating.setQuestionId(questionId);
        rating.setScore(normalizedScore);
        rating.setComment(trimmedComment.isEmpty() ? null : trimmedComment);
        rating.setCategory(normalizedCategory);
        rating.setContext(normalizedContext);
        rating.setRatedAt(Instant.now());
        ratings.save(rating);
        return toView(rating, aggregateRating(questionId));
    }

    public FeedbackView getUserFeedback(String userId, String questionId) {
        RatingAggregate agg = aggregateRating(questionId);
        return ratings.findByUserIdAndQuestionId(userId, questionId)
                .map(r -> toView(r, agg))
                .orElse(new FeedbackView(0, null, null, null, agg));
    }

    public AdminFeedbackPage listForAdmin(String questionIdFilter, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<QuestionRating> pageResult = questionIdFilter == null || questionIdFilter.isBlank()
                ? ratings.findAllByOrderByRatedAtDesc(pageable)
                : ratings.findByQuestionIdOrderByRatedAtDesc(questionIdFilter.trim(), pageable);

        List<QuestionRating> rows = pageResult.getContent();
        Map<String, Question> questionById = loadQuestions(rows);
        Map<String, UserAccount> userById = loadUsers(rows);

        List<AdminFeedbackRow> items = rows.stream()
                .map(r -> toAdminRow(r, questionById.get(r.getQuestionId()), userById.get(r.getUserId())))
                .toList();

        return new AdminFeedbackPage(
                items,
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                safePage,
                safeSize);
    }

    public RatingAggregate aggregateRating(String questionId) {
        List<QuestionRating> all = ratings.findByQuestionId(questionId);
        List<QuestionRating> scored = all.stream().filter(r -> r.getScore() >= 1).toList();
        if (scored.isEmpty()) {
            return new RatingAggregate(0, 0);
        }
        double avg = scored.stream().mapToInt(QuestionRating::getScore).average().orElse(0);
        return new RatingAggregate(scored.size(), Math.round(avg * 10.0) / 10.0);
    }

    private Question requireQuestion(String questionId) {
        return questions.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    private Map<String, Question> loadQuestions(List<QuestionRating> rows) {
        Set<String> ids = rows.stream().map(QuestionRating::getQuestionId).collect(Collectors.toSet());
        Map<String, Question> map = new HashMap<>();
        for (String id : ids) {
            questions.findByQuestionId(id).ifPresent(q -> map.put(id, q));
        }
        return map;
    }

    private Map<String, UserAccount> loadUsers(List<QuestionRating> rows) {
        Set<String> ids = rows.stream().map(QuestionRating::getUserId).collect(Collectors.toSet());
        Map<String, UserAccount> map = new HashMap<>();
        for (String id : ids) {
            users.findById(id).ifPresent(u -> map.put(id, u));
        }
        return map;
    }

    private static FeedbackView toView(QuestionRating r, RatingAggregate agg) {
        return new FeedbackView(r.getScore(), r.getComment(), r.getCategory(), r.getContext(), agg);
    }

    private static AdminFeedbackRow toAdminRow(QuestionRating r, Question q, UserAccount user) {
        String email = user == null ? "(deleted user)" : user.getEmail();
        String exam = q == null ? "" : nullToEmpty(q.getExam());
        int year = q == null ? 0 : q.getYear();
        int questionNo = q == null ? 0 : q.getQuestionNo();
        String subject = q == null ? "" : nullToEmpty(q.getSubject());
        String packId = q == null ? "" : nullToEmpty(q.getPackId());
        int variantNo = q == null ? 0 : q.getVariantNo();
        return new AdminFeedbackRow(
                r.getId(),
                r.getQuestionId(),
                r.getUserId(),
                email,
                r.getScore(),
                r.getComment(),
                r.getCategory(),
                r.getContext(),
                r.getRatedAt(),
                exam,
                year,
                questionNo,
                subject,
                packId,
                variantNo);
    }

    private static int normalizeScore(int score) {
        return score < 0 ? 0 : score;
    }

    private static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "general";
        }
        String normalized = category.trim().toLowerCase();
        if (!ALLOWED_CATEGORIES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid feedback category");
        }
        return normalized;
    }

    private static String normalizeContext(String context) {
        if (context == null || context.isBlank()) {
            return "solve";
        }
        String normalized = context.trim().toLowerCase();
        return switch (normalized) {
            case "solve", "practice", "test" -> normalized;
            default -> "solve";
        };
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    public record FeedbackView(
            int yourScore, String comment, String category, String context, RatingAggregate aggregate) {}

    public record RatingAggregate(int count, double average) {}

    public record AdminFeedbackRow(
            String id,
            String questionId,
            String userId,
            String userEmail,
            int score,
            String comment,
            String category,
            String context,
            Instant ratedAt,
            String exam,
            int year,
            int questionNo,
            String subject,
            String packId,
            int variantNo) {}

    public record AdminFeedbackPage(
            List<AdminFeedbackRow> items, long total, int totalPages, int page, int size) {}
}

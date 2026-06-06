package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.PracticeSession;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.model.QuestionAttempt;
import com.neetlu.examhunt.model.QuestionRating;
import com.neetlu.examhunt.repository.PracticeSessionRepository;
import com.neetlu.examhunt.repository.QuestionAttemptRepository;
import com.neetlu.examhunt.repository.QuestionRatingRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PracticeService {

    private static final int SESSION_SIZE = 20;

    private final PracticeSessionRepository sessions;
    private final QuestionRepository questions;
    private final QuestionAttemptRepository attempts;
    private final QuestionRatingRepository ratings;
    private final AnswerValidationService validation;

    public PracticeService(
            PracticeSessionRepository sessions,
            QuestionRepository questions,
            QuestionAttemptRepository attempts,
            QuestionRatingRepository ratings,
            AnswerValidationService validation) {
        this.sessions = sessions;
        this.questions = questions;
        this.attempts = attempts;
        this.ratings = ratings;
        this.validation = validation;
    }

    public PracticeSession createSession(String userId, CreateSessionRequest req) {
        if (req.packId() == null || req.packId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "packId is required");
        }
        List<Question> list = filterPool(loadPool(req), req);
        if (list.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No questions match these filters");
        }

        int startLevel = 2;
        List<Question> ordered = req.adaptive()
                ? list.stream()
                        .sorted(Comparator.comparingInt(q -> Math.abs(q.getDifficulty() - startLevel)))
                        .toList()
                : list;

        List<String> questionIds = buildQuestionIds(ordered, list, req);

        PracticeSession session = new PracticeSession();
        session.setUserId(userId);
        session.setExam(req.exam() != null ? req.exam() : "NEET");
        session.setPackId(req.packId());
        session.setFilters(filtersMap(req));
        session.setQuestionIds(questionIds);
        session.setMaxMarks(questionIds.size() * 4);
        session.setAdaptiveLevel(2);
        return sessions.save(session);
    }

    public PracticeSession requireSession(String userId, String sessionId) {
        PracticeSession session = sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        return reconcileSessionProgress(session);
    }

    public Question requireQuestion(String questionId) {
        return questions.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    /**
     * Skip stale question ids (e.g. after a pack re-import) so resume links stay valid.
     */
    private PracticeSession reconcileSessionProgress(PracticeSession session) {
        if (!"active".equals(session.getStatus())) {
            return session;
        }
        List<String> ids = session.getQuestionIds();
        if (ids == null || ids.isEmpty()) {
            session.setStatus("completed");
            session.setCompletedAt(Instant.now());
            return sessions.save(session);
        }
        int idx = Math.max(0, Math.min(session.getCurrentIndex(), ids.size()));
        while (idx < ids.size()) {
            if (questions.findByQuestionId(ids.get(idx)).isPresent()) {
                if (idx != session.getCurrentIndex()) {
                    session.setCurrentIndex(idx);
                    return sessions.save(session);
                }
                return session;
            }
            idx++;
        }
        session.setStatus("completed");
        session.setCompletedAt(Instant.now());
        session.setCurrentIndex(ids.size());
        return sessions.save(session);
    }

    public SubmitResult submitAnswer(String userId, SubmitRequest req) {
        PracticeSession session = requireSession(userId, req.sessionId());
        if (!"active".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is already completed");
        }
        if (!session.getQuestionIds().contains(req.questionId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question is not in this session");
        }
        attempts.findBySessionIdAndQuestionId(session.getId(), req.questionId()).ifPresent(a -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Question already answered in this session");
        });

        Question q = requireQuestion(req.questionId());
        boolean correct = validation.isCorrect(q.getAnswer(), req.selectedAnswer());
        int marks = validation.marksForAttempt(correct);

        QuestionAttempt attempt = new QuestionAttempt();
        attempt.setUserId(userId);
        attempt.setSessionId(session.getId());
        attempt.setQuestionId(q.getQuestionId());
        attempt.setPackId(q.getPackId());
        attempt.setSelectedAnswer(validation.normalize(req.selectedAnswer()));
        attempt.setCorrect(correct);
        attempt.setMarksAwarded(marks);
        attempts.save(attempt);

        if (correct) {
            session.setCorrectCount(session.getCorrectCount() + 1);
        } else {
            session.setWrongCount(session.getWrongCount() + 1);
        }
        session.setTotalMarks(session.getTotalMarks() + marks);
        session.setAdaptiveLevel(clampAdaptive(session.getAdaptiveLevel() + (correct ? 1 : -1)));
        reorderRemainingByAdaptive(session, req.questionId());

        int idx = session.getQuestionIds().indexOf(req.questionId());
        if (idx >= session.getCurrentIndex()) {
            session.setCurrentIndex(idx + 1);
        }
        if (session.getCurrentIndex() >= session.getQuestionIds().size()) {
            session.setStatus("completed");
            session.setCompletedAt(Instant.now());
        }
        sessions.save(session);

        String nextQuestionId = null;
        if (session.getCurrentIndex() < session.getQuestionIds().size()) {
            nextQuestionId = session.getQuestionIds().get(session.getCurrentIndex());
        }

        return new SubmitResult(
                correct,
                validation.normalize(q.getAnswer()),
                marks,
                session.getTotalMarks(),
                session.getMaxMarks(),
                session.getCorrectCount(),
                session.getWrongCount(),
                session.getAdaptiveLevel(),
                session.getStatus(),
                nextQuestionId,
                q.getSolutionImageUrl(),
                q.isHasSolution());
    }

    public ProgressSummary progress(String userId) {
        long total = attempts.countByUserId(userId);
        long correct = attempts.countByUserIdAndCorrect(userId, true);
        List<PracticeSession> recent = sessions.findByUserIdOrderByStartedAtDesc(userId).stream()
                .limit(10)
                .toList();

        List<QuestionAttempt> userAttempts = attempts.findByUserIdOrderByAnsweredAtDesc(userId);

        Map<String, PackStats> byPack = new LinkedHashMap<>();
        Map<String, ChapterStats> byChapter = new LinkedHashMap<>();
        Set<String> questionIds =
                userAttempts.stream().map(QuestionAttempt::getQuestionId).collect(Collectors.toSet());
        Map<String, Question> questionById = questions.findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q, (a, b) -> a));

        for (QuestionAttempt a : userAttempts) {
            byPack.computeIfAbsent(a.getPackId(), k -> new PackStats())
                    .add(a.isCorrect(), a.getMarksAwarded());
            Question q = questionById.get(a.getQuestionId());
            if (q == null || q.getChapter() == null || q.getChapter().isBlank()) {
                continue;
            }
            String chapterKey = q.getSubject() + "\u0000" + q.getChapter();
            byChapter.computeIfAbsent(chapterKey, k -> new ChapterStats(q.getSubject(), q.getChapter()))
                    .add(a.isCorrect(), a.getMarksAwarded());
        }

        List<ChapterProgress> weakChapters = byChapter.values().stream()
                .filter(c -> c.attempts >= 2)
                .sorted(Comparator.comparingInt(ChapterStats::accuracyPercent)
                        .thenComparingInt(c -> c.marks)
                        .thenComparingInt(c -> -c.attempts))
                .limit(8)
                .map(c -> new ChapterProgress(
                        c.subject, c.chapter, c.attempts, c.correct, c.marks, c.accuracyPercent()))
                .toList();

        return new ProgressSummary(
                total,
                correct,
                total > 0 ? (int) Math.round((correct * 100.0) / total) : 0,
                recent.stream().map(this::sessionView).toList(),
                byPack.entrySet().stream()
                        .map(e -> new PackProgress(
                                e.getKey(),
                                e.getValue().attempts,
                                e.getValue().correct,
                                e.getValue().marks))
                        .toList(),
                weakChapters);
    }

    public RatingView rateQuestion(String userId, String questionId, int score, String comment) {
        if (score < 1 || score > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be 1–5");
        }
        requireQuestion(questionId);
        QuestionRating rating = ratings.findByUserIdAndQuestionId(userId, questionId)
                .orElseGet(QuestionRating::new);
        rating.setUserId(userId);
        rating.setQuestionId(questionId);
        rating.setScore(score);
        rating.setComment(comment);
        rating.setRatedAt(Instant.now());
        ratings.save(rating);
        return new RatingView(score, 1, comment, aggregateRating(questionId));
    }

    public RatingView getUserRating(String userId, String questionId) {
        RatingAggregate agg = aggregateRating(questionId);
        return ratings.findByUserIdAndQuestionId(userId, questionId)
                .map(r -> new RatingView(r.getScore(), 1, r.getComment(), agg))
                .orElse(new RatingView(0, 0, null, agg));
    }

    public SessionView toView(PracticeSession s) {
        return sessionView(s);
    }

    private RatingAggregate aggregateRating(String questionId) {
        List<QuestionRating> all = ratings.findByQuestionId(questionId);
        if (all.isEmpty()) {
            return new RatingAggregate(0, 0);
        }
        double avg = all.stream().mapToInt(QuestionRating::getScore).average().orElse(0);
        return new RatingAggregate(all.size(), Math.round(avg * 10.0) / 10.0);
    }

    private List<String> buildQuestionIds(
            List<Question> ordered, List<Question> filteredPool, CreateSessionRequest req) {
        String rawStartId = req.startQuestionId();
        if (rawStartId == null || rawStartId.isBlank()) {
            return ordered.stream().limit(SESSION_SIZE).map(Question::getQuestionId).toList();
        }

        final String startId = rawStartId.trim();
        Question startQ = requireQuestion(startId);
        if (!req.packId().equals(startQ.getPackId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question is not in this pack");
        }
        boolean inPool = filteredPool.stream().anyMatch(q -> q.getQuestionId().equals(startId));
        if (!inPool) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Question does not match session filters");
        }

        List<String> ids = new ArrayList<>();
        ids.add(startId);
        for (Question q : ordered) {
            if (ids.size() >= SESSION_SIZE) {
                break;
            }
            if (!q.getQuestionId().equals(startId)) {
                ids.add(q.getQuestionId());
            }
        }
        return ids;
    }

    private List<Question> loadPool(CreateSessionRequest req) {
        PageRequest pageable = PageRequest.of(0, 300, Sort.by("questionNo"));
        if (req.subject() != null && !req.subject().isBlank()
                && req.chapter() != null && !req.chapter().isBlank()) {
            return questions
                    .findByPackIdAndSubjectIgnoreCaseAndChapterIgnoreCase(
                            req.packId(), req.subject(), req.chapter(), pageable)
                    .getContent();
        }
        if (req.subject() != null && !req.subject().isBlank()) {
            return questions.findByPackIdAndSubjectIgnoreCase(req.packId(), req.subject(), pageable)
                    .getContent();
        }
        return questions.findByPackId(req.packId(), pageable).getContent();
    }

    private List<Question> filterPool(List<Question> pool, CreateSessionRequest req) {
        List<Question> list = new ArrayList<>(pool);
        if (req.topic() != null && !req.topic().isBlank()) {
            list = list.stream().filter(q -> req.topic().equals(q.getTopic())).toList();
        }
        if (req.difficulty() != null && !req.difficulty().isBlank()) {
            int d = parseDifficulty(req.difficulty());
            if (d > 0) {
                list = list.stream().filter(q -> q.getDifficulty() == d).toList();
            }
        }
        return list;
    }

    private int parseDifficulty(String label) {
        return switch (label.toLowerCase()) {
            case "easy" -> 1;
            case "medium" -> 2;
            case "hard" -> 3;
            default -> 0;
        };
    }

    private static Map<String, String> filtersMap(CreateSessionRequest req) {
        Map<String, String> m = new HashMap<>();
        if (req.subject() != null) m.put("subject", req.subject());
        if (req.chapter() != null) m.put("chapter", req.chapter());
        if (req.topic() != null) m.put("topic", req.topic());
        if (req.difficulty() != null) m.put("difficulty", req.difficulty());
        return m;
    }

    private static int clampAdaptive(int level) {
        return Math.max(1, Math.min(3, level));
    }

    /** Re-sort unanswered questions so the next one matches the updated adaptive level (1=easy … 3=hard). */
    private void reorderRemainingByAdaptive(PracticeSession session, String answeredQuestionId) {
        List<String> ids = session.getQuestionIds();
        int answeredIdx = ids.indexOf(answeredQuestionId);
        if (answeredIdx < 0 || answeredIdx >= ids.size() - 1) {
            return;
        }
        List<String> head = new ArrayList<>(ids.subList(0, answeredIdx + 1));
        List<String> tail = new ArrayList<>(ids.subList(answeredIdx + 1, ids.size()));
        int target = session.getAdaptiveLevel();
        tail.sort(Comparator.comparingInt(qid -> {
            return questions.findByQuestionId(qid)
                    .map(q -> Math.abs(q.getDifficulty() - target))
                    .orElse(999);
        }));
        head.addAll(tail);
        session.setQuestionIds(head);
    }

    private SessionView sessionView(PracticeSession s) {
        String current = null;
        if (!s.getQuestionIds().isEmpty() && s.getCurrentIndex() < s.getQuestionIds().size()) {
            current = s.getQuestionIds().get(s.getCurrentIndex());
        }
        return new SessionView(
                s.getId(),
                s.getPackId(),
                s.getExam(),
                s.getStatus(),
                s.getQuestionIds().size(),
                s.getCurrentIndex(),
                s.getCorrectCount(),
                s.getWrongCount(),
                s.getTotalMarks(),
                s.getMaxMarks(),
                s.getAdaptiveLevel(),
                s.getStartedAt(),
                s.getCompletedAt(),
                current);
    }

    public record CreateSessionRequest(
            String exam,
            String packId,
            String subject,
            String chapter,
            String topic,
            String difficulty,
            boolean adaptive,
            String startQuestionId) {}

    public record SubmitRequest(String sessionId, String questionId, String selectedAnswer) {}

    public record SubmitResult(
            boolean correct,
            String correctAnswer,
            int marksAwarded,
            int sessionTotalMarks,
            int sessionMaxMarks,
            int correctCount,
            int wrongCount,
            int adaptiveLevel,
            String sessionStatus,
            String nextQuestionId,
            String solutionImageUrl,
            boolean hasSolution) {}

    public record SessionView(
            String id,
            String packId,
            String exam,
            String status,
            int questionCount,
            int currentIndex,
            int correctCount,
            int wrongCount,
            int totalMarks,
            int maxMarks,
            int adaptiveLevel,
            Instant startedAt,
            Instant completedAt,
            String currentQuestionId) {}

    public record ProgressSummary(
            long totalAttempts,
            long correctAttempts,
            int accuracyPercent,
            List<SessionView> recentSessions,
            List<PackProgress> byPack,
            List<ChapterProgress> weakChapters) {}

    public record PackProgress(String packId, int attempts, int correct, int marks) {}

    public record ChapterProgress(
            String subject, String chapter, int attempts, int correct, int marks, int accuracyPercent) {}

    public record RatingView(int yourScore, int yourVotes, String comment, RatingAggregate aggregate) {}

    public record RatingAggregate(int count, double average) {}

    private static class PackStats {
        int attempts;
        int correct;
        int marks;

        void add(boolean correct, int marks) {
            attempts++;
            if (correct) this.correct++;
            this.marks += marks;
        }
    }

    private static class ChapterStats {
        final String subject;
        final String chapter;
        int attempts;
        int correct;
        int marks;

        ChapterStats(String subject, String chapter) {
            this.subject = subject;
            this.chapter = chapter;
        }

        void add(boolean wasCorrect, int marksAwarded) {
            attempts++;
            if (wasCorrect) this.correct++;
            this.marks += marksAwarded;
        }

        int accuracyPercent() {
            return attempts > 0 ? (int) Math.round((correct * 100.0) / attempts) : 0;
        }
    }
}

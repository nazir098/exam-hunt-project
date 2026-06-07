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
    private static final int DEFAULT_TEST_SIZE = 45;

    public static final String MODE_PRACTICE = "practice";
    public static final String MODE_TEST = "test";

    private final PracticeSessionRepository sessions;
    private final QuestionRepository questions;
    private final QuestionAttemptRepository attempts;
    private final QuestionRatingRepository ratings;
    private final AnswerValidationService validation;
    private final RevisionService revisionService;

    public PracticeService(
            PracticeSessionRepository sessions,
            QuestionRepository questions,
            QuestionAttemptRepository attempts,
            QuestionRatingRepository ratings,
            AnswerValidationService validation,
            RevisionService revisionService) {
        this.sessions = sessions;
        this.questions = questions;
        this.attempts = attempts;
        this.ratings = ratings;
        this.validation = validation;
        this.revisionService = revisionService;
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
        String mode = normalizeMode(req.mode());

        PracticeSession session = new PracticeSession();
        session.setUserId(userId);
        session.setExam(req.exam() != null ? req.exam() : "NEET");
        session.setPackId(req.packId());
        session.setFilters(filtersMap(req));
        session.setQuestionIds(questionIds);
        session.setMaxMarks(questionIds.size() * 4);
        session.setAdaptiveLevel(2);
        session.setMode(mode);
        return sessions.save(session);
    }

    /**
     * New timed test containing only wrong, skipped, or unanswered questions from a completed test.
     */
    public PracticeSession createRetakeTestSession(String userId, String sourceSessionId, String filter) {
        PracticeSession source = sessions.findByIdAndUserId(sourceSessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (!"completed".equals(source.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session not completed yet");
        }
        if (!MODE_TEST.equals(source.getMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Retake is only available for test sessions");
        }

        List<String> sourceIds = source.getQuestionIds() != null ? source.getQuestionIds() : List.of();
        if (sourceIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source test has no questions");
        }

        Map<String, QuestionAttempt> attemptByQ = attempts.findBySessionId(sourceSessionId).stream()
                .collect(Collectors.toMap(QuestionAttempt::getQuestionId, a -> a, (a, b) -> a));
        Set<String> skipped = source.getSkippedQuestionIds() != null
                ? new java.util.HashSet<>(source.getSkippedQuestionIds())
                : Set.of();
        Set<String> unanswered = source.getUnansweredQuestionIds() != null
                ? new java.util.HashSet<>(source.getUnansweredQuestionIds())
                : Set.of();

        String normalizedFilter = filter != null ? filter.trim().toLowerCase() : "";
        List<String> retakeIds = new ArrayList<>();
        for (String qid : sourceIds) {
            String status = reviewStatusForQuestion(qid, attemptByQ.get(qid), skipped, unanswered);
            if (matchesRetakeFilter(status, normalizedFilter)) {
                retakeIds.add(qid);
            }
        }
        if (retakeIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No questions match this retake filter");
        }

        long missing = retakeIds.stream()
                .filter(qid -> questions.findByQuestionId(qid).isEmpty())
                .count();
        if (missing > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Some questions are no longer available in the question bank");
        }

        PracticeSession session = new PracticeSession();
        session.setUserId(userId);
        session.setExam(source.getExam() != null ? source.getExam() : "NEET");
        session.setPackId(source.getPackId());
        session.setFilters(source.getFilters() != null ? new HashMap<>(source.getFilters()) : new HashMap<>());
        session.setQuestionIds(retakeIds);
        session.setMaxMarks(retakeIds.size() * 4);
        session.setAdaptiveLevel(2);
        session.setMode(MODE_TEST);
        return sessions.save(session);
    }

    private static String reviewStatusForQuestion(
            String qid, QuestionAttempt att, Set<String> skipped, Set<String> unanswered) {
        if (att != null) {
            return att.isCorrect() ? "correct" : "wrong";
        }
        if (unanswered.contains(qid)) {
            return "unattempted";
        }
        if (skipped.contains(qid)) {
            return "skipped";
        }
        return "unattempted";
    }

    private static boolean matchesRetakeFilter(String status, String filter) {
        return switch (filter) {
            case "wrong" -> "wrong".equals(status);
            case "skipped" -> "skipped".equals(status);
            case "unanswered" -> "unattempted".equals(status);
            case "mistakes" -> "wrong".equals(status) || "skipped".equals(status) || "unattempted".equals(status);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid retake filter");
        };
    }

    private static String normalizeMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return MODE_PRACTICE;
        }
        return switch (mode.toLowerCase()) {
            case "test" -> MODE_TEST;
            default -> MODE_PRACTICE;
        };
    }

    private int resolveSessionSize(CreateSessionRequest req, String mode) {
        if (req.questionCount() != null && req.questionCount() > 0) {
            return Math.min(180, Math.max(5, req.questionCount()));
        }
        return MODE_TEST.equals(mode) ? DEFAULT_TEST_SIZE : SESSION_SIZE;
    }

    public static boolean countsForLeaderboard(QuestionAttempt a) {
        String mode = a.getMode();
        return mode == null || mode.isBlank() || MODE_PRACTICE.equals(mode);
    }

    public static boolean countsForAnalytics(QuestionAttempt a) {
        String mode = a.getMode();
        return mode == null
                || mode.isBlank()
                || MODE_PRACTICE.equals(mode)
                || MODE_TEST.equals(mode);
    }

    public PracticeSession requireSession(String userId, String sessionId) {
        PracticeSession session = sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        return reconcileSessionProgress(session);
    }

    /** Active test sessions skip reconcile on every answer — questions are fixed at creation. */
    private PracticeSession requireSessionForAnswer(String userId, String sessionId) {
        PracticeSession session = sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (MODE_TEST.equals(session.getMode()) && "active".equals(session.getStatus())) {
            return session;
        }
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
        PracticeSession session = requireSessionForAnswer(userId, req.sessionId());
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
        attempt.setMode(session.getMode() != null ? session.getMode() : MODE_PRACTICE);
        attempts.save(attempt);

        if (correct) {
            session.setCorrectCount(session.getCorrectCount() + 1);
        } else {
            session.setWrongCount(session.getWrongCount() + 1);
        }
        session.setTotalMarks(session.getTotalMarks() + marks);
        if (!MODE_TEST.equals(session.getMode())) {
            session.setAdaptiveLevel(clampAdaptive(session.getAdaptiveLevel() + (correct ? 1 : -1)));
            reorderRemainingByAdaptive(session, req.questionId());
        }

        int idx = session.getQuestionIds().indexOf(req.questionId());
        if (idx >= session.getCurrentIndex()) {
            session.setCurrentIndex(idx + 1);
        }
        if (session.getCurrentIndex() >= session.getQuestionIds().size()) {
            if (!MODE_TEST.equals(session.getMode())) {
                session.setStatus("completed");
                session.setCompletedAt(Instant.now());
            }
        }
        sessions.save(session);
        if ("completed".equals(session.getStatus())) {
            onSessionCompletedAsync(userId, session);
        }

        String nextQuestionId = null;
        if (session.getCurrentIndex() < session.getQuestionIds().size()) {
            nextQuestionId = session.getQuestionIds().get(session.getCurrentIndex());
        }

        return toSubmitResult(session, q, correct, marks, nextQuestionId);
    }

    /** Practice returns full feedback; test omits answer/solution fields (exam simulation). */
    private SubmitResult toSubmitResult(
            PracticeSession session, Question q, boolean correct, int marks, String nextQuestionId) {
        if (MODE_TEST.equals(session.getMode())) {
            return new SubmitResult(
                    false,
                    "",
                    0,
                    session.getTotalMarks(),
                    session.getMaxMarks(),
                    session.getCorrectCount(),
                    session.getWrongCount(),
                    session.getSkipCount(),
                    session.getAdaptiveLevel(),
                    session.getStatus(),
                    nextQuestionId,
                    "",
                    false);
        }
        return new SubmitResult(
                correct,
                validation.normalize(q.getAnswer()),
                marks,
                session.getTotalMarks(),
                session.getMaxMarks(),
                session.getCorrectCount(),
                session.getWrongCount(),
                session.getSkipCount(),
                session.getAdaptiveLevel(),
                session.getStatus(),
                nextQuestionId,
                q.getSolutionImageUrl(),
                q.isHasSolution());
    }

    public SkipResult skipQuestion(String userId, SkipRequest req) {
        PracticeSession session = requireSessionForAnswer(userId, req.sessionId());
        if (!"active".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is already completed");
        }
        List<String> ids = session.getQuestionIds();
        if (session.getCurrentIndex() >= ids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No more questions in this session");
        }
        String currentId = ids.get(session.getCurrentIndex());
        if (!currentId.equals(req.questionId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can only skip the current question");
        }
        attempts.findBySessionIdAndQuestionId(session.getId(), req.questionId()).ifPresent(a -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Question already answered in this session");
        });

        session.setSkipCount(session.getSkipCount() + 1);
        if (session.getSkippedQuestionIds() == null) {
            session.setSkippedQuestionIds(new ArrayList<>());
        }
        if (!session.getSkippedQuestionIds().contains(req.questionId())) {
            session.getSkippedQuestionIds().add(req.questionId());
        }
        session.setCurrentIndex(session.getCurrentIndex() + 1);
        if (session.getCurrentIndex() >= ids.size()) {
            if (!MODE_TEST.equals(session.getMode())) {
                session.setStatus("completed");
                session.setCompletedAt(Instant.now());
            }
        }
        sessions.save(session);
        if ("completed".equals(session.getStatus())) {
            onSessionCompletedAsync(userId, session);
        }

        String nextQuestionId = null;
        if (session.getCurrentIndex() < ids.size()) {
            nextQuestionId = ids.get(session.getCurrentIndex());
        }

        return new SkipResult(
                session.getSkipCount(),
                session.getCorrectCount(),
                session.getWrongCount(),
                session.getTotalMarks(),
                session.getMaxMarks(),
                session.getAdaptiveLevel(),
                session.getStatus(),
                nextQuestionId);
    }

    public ProgressSummary progress(String userId) {
        List<QuestionAttempt> userAttempts = attempts.findByUserIdOrderByAnsweredAtDesc(userId);
        List<QuestionAttempt> analyticsAttempts =
                userAttempts.stream().filter(PracticeService::countsForAnalytics).toList();
        long total = analyticsAttempts.size();
        long correct = analyticsAttempts.stream().filter(QuestionAttempt::isCorrect).count();
        List<PracticeSession> recent = sessions.findByUserIdOrderByStartedAtDesc(userId).stream()
                .limit(10)
                .toList();

        Map<String, PackStats> byPack = new LinkedHashMap<>();
        Map<String, ChapterStats> byChapter = new LinkedHashMap<>();
        Set<String> questionIds =
                userAttempts.stream().map(QuestionAttempt::getQuestionId).collect(Collectors.toSet());
        Map<String, Question> questionById = questions.findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q, (a, b) -> a));

        for (QuestionAttempt a : userAttempts) {
            if (!countsForAnalytics(a)) {
                continue;
            }
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
        int size = resolveSessionSize(req, normalizeMode(req.mode()));
        String rawStartId = req.startQuestionId();
        if (rawStartId == null || rawStartId.isBlank()) {
            return ordered.stream().limit(size).map(Question::getQuestionId).toList();
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
            if (ids.size() >= size) {
                break;
            }
            if (!q.getQuestionId().equals(startId)) {
                ids.add(q.getQuestionId());
            }
        }
        return ids;
    }

    private List<Question> loadPool(CreateSessionRequest req) {
        PageRequest pageable = PageRequest.of(0, 500, Sort.by("questionNo"));
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
        Map<String, Question> qById = questions.findByQuestionIdIn(tail).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q, (a, b) -> a));
        tail.sort(Comparator.comparingInt(qid -> {
            Question q = qById.get(qid);
            return q != null ? Math.abs(q.getDifficulty() - target) : 999;
        }));
        head.addAll(tail);
        session.setQuestionIds(head);
    }

    public SessionView toggleMarkForReview(String userId, String sessionId, String questionId) {
        PracticeSession session = requireSession(userId, sessionId);
        if (!MODE_TEST.equals(session.getMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mark for review is only available in test mode");
        }
        if (!session.getQuestionIds().contains(questionId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question is not in this session");
        }
        if (session.getMarkedForReviewIds() == null) {
            session.setMarkedForReviewIds(new ArrayList<>());
        }
        List<String> marked = session.getMarkedForReviewIds();
        if (marked.contains(questionId)) {
            marked.remove(questionId);
        } else {
            marked.add(questionId);
        }
        sessions.save(session);
        return sessionView(session);
    }

    /** End an active session early (used for test submit). Returns full result in one round trip. */
    public SessionResultView finishSession(String userId, String sessionId) {
        PracticeSession session = requireSession(userId, sessionId);
        if (!"active".equals(session.getStatus())) {
            return getSessionResult(userId, sessionId);
        }
        if (MODE_TEST.equals(session.getMode())) {
            markUnattemptedAsSkipped(session);
        }
        session.setStatus("completed");
        session.setCompletedAt(Instant.now());
        if (session.getQuestionIds() != null) {
            session.setCurrentIndex(session.getQuestionIds().size());
        }
        sessions.save(session);
        onSessionCompletedAsync(userId, session);
        return getSessionResult(userId, sessionId);
    }

    private void markUnattemptedAsSkipped(PracticeSession session) {
        List<String> ids = session.getQuestionIds();
        if (ids == null || ids.isEmpty()) {
            return;
        }
        Set<String> attempted = attempts.findBySessionId(session.getId()).stream()
                .map(QuestionAttempt::getQuestionId)
                .collect(Collectors.toSet());
        if (session.getSkippedQuestionIds() == null) {
            session.setSkippedQuestionIds(new ArrayList<>());
        }
        if (session.getUnansweredQuestionIds() == null) {
            session.setUnansweredQuestionIds(new ArrayList<>());
        }
        Set<String> skipped = new java.util.HashSet<>(session.getSkippedQuestionIds());
        for (String qid : ids) {
            if (!attempted.contains(qid) && !skipped.contains(qid)) {
                session.getSkippedQuestionIds().add(qid);
                session.getUnansweredQuestionIds().add(qid);
                session.setSkipCount(session.getSkipCount() + 1);
                skipped.add(qid);
            }
        }
    }

    private void onSessionCompletedAsync(String userId, PracticeSession session) {
        java.util.concurrent.CompletableFuture.runAsync(
                () -> revisionService.enqueueWrongAttemptsForSession(userId, session.getId()));
    }

    public SessionResultView getSessionResult(String userId, String sessionId) {
        PracticeSession session = requireSession(userId, sessionId);
        if (!"completed".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session not completed yet");
        }
        SessionView view = sessionView(session);
        List<QuestionAttempt> sessionAttempts = attempts.findBySessionId(sessionId);
        Set<String> qIds = session.getQuestionIds() != null
                ? new java.util.HashSet<>(session.getQuestionIds())
                : Set.of();
        Map<String, Question> qById = questions.findByQuestionIdIn(qIds).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q, (a, b) -> a));
        Map<String, QuestionAttempt> attemptByQ = sessionAttempts.stream()
                .collect(Collectors.toMap(QuestionAttempt::getQuestionId, a -> a, (a, b) -> b));
        Set<String> skipped = session.getSkippedQuestionIds() != null
                ? new java.util.HashSet<>(session.getSkippedQuestionIds())
                : Set.of();
        Set<String> unanswered = session.getUnansweredQuestionIds() != null
                ? new java.util.HashSet<>(session.getUnansweredQuestionIds())
                : Set.of();

        long timeTakenSeconds = 0;
        if (session.getStartedAt() != null && session.getCompletedAt() != null) {
            timeTakenSeconds = Math.max(
                    0, session.getCompletedAt().getEpochSecond() - session.getStartedAt().getEpochSecond());
        }
        int answered = session.getCorrectCount() + session.getWrongCount();
        int accuracyPercent = answered > 0 ? (int) Math.round((session.getCorrectCount() * 100.0) / answered) : 0;
        boolean countsForRank = MODE_PRACTICE.equals(session.getMode() != null ? session.getMode() : MODE_PRACTICE);

        Map<String, BreakdownStats> bySubject = new LinkedHashMap<>();
        Map<String, BreakdownStats> byChapter = new LinkedHashMap<>();
        Map<Integer, int[]> byDifficulty = new HashMap<>();

        List<SessionQuestionReview> reviews = new ArrayList<>();
        List<String> ids = session.getQuestionIds() != null ? session.getQuestionIds() : List.of();
        for (int i = 0; i < ids.size(); i++) {
            String qid = ids.get(i);
            Question q = qById.get(qid);
            if (q == null) {
                continue;
            }
            QuestionAttempt att = attemptByQ.get(qid);
            String status;
            String selected = "";
            String correctAns = validation.normalize(q.getAnswer());
            if (att != null) {
                status = att.isCorrect() ? "correct" : "wrong";
                selected = att.getSelectedAnswer();
                trackBreakdown(bySubject, byChapter, q, att.isCorrect());
                int diff = Math.max(1, Math.min(3, q.getDifficulty()));
                byDifficulty.computeIfAbsent(diff, k -> new int[] {0, 0});
                if (att.isCorrect()) {
                    byDifficulty.get(diff)[0]++;
                } else {
                    byDifficulty.get(diff)[1]++;
                }
            } else if (unanswered.contains(qid)) {
                status = "unattempted";
            } else if (skipped.contains(qid)) {
                status = "skipped";
            } else if (MODE_TEST.equals(session.getMode())) {
                status = "unattempted";
            } else {
                status = "unattempted";
            }
            reviews.add(new SessionQuestionReview(
                    i + 1,
                    qid,
                    status,
                    selected,
                    correctAns,
                    q.isHasSolution(),
                    q.getSolutionImageUrl(),
                    q.getSubject(),
                    q.getChapter(),
                    q.getQuestionNo(),
                    q.getDifficulty()));
        }

        List<BreakdownRow> subjectBreakdown = bySubject.values().stream()
                .sorted(Comparator.comparingInt(BreakdownStats::accuracyPercent))
                .map(BreakdownStats::toRow)
                .toList();
        List<BreakdownRow> chapterBreakdown = byChapter.values().stream()
                .sorted(Comparator.comparingInt(BreakdownStats::accuracyPercent))
                .map(BreakdownStats::toChapterRow)
                .toList();

        List<ChapterProgress> weakInSession = byChapter.values().stream()
                .filter(b -> b.wrong > 0)
                .sorted(Comparator.comparingInt((BreakdownStats b) -> b.wrong).reversed())
                .limit(5)
                .map(b -> new ChapterProgress(
                        b.subject, b.chapterLabel, b.attempts, b.correct, b.marks, b.accuracyPercent()))
                .toList();
        List<ChapterProgress> strongInSession = byChapter.values().stream()
                .filter(b -> b.attempts >= 2 && b.accuracyPercent() >= 75)
                .sorted(Comparator.comparingInt(BreakdownStats::accuracyPercent).reversed())
                .limit(5)
                .map(b -> new ChapterProgress(
                        b.subject, b.chapterLabel, b.attempts, b.correct, b.marks, b.accuracyPercent()))
                .toList();

        Set<String> wrongQIds = sessionAttempts.stream()
                .filter(a -> !a.isCorrect())
                .map(QuestionAttempt::getQuestionId)
                .collect(Collectors.toSet());
        Set<String> revisedIds = revisionService.revisedQuestionIds(userId, wrongQIds);
        List<WrongAttemptView> wrongAttempts = sessionAttempts.stream()
                .filter(a -> !a.isCorrect())
                .map(a -> toWrongAttemptView(a, qById.get(a.getQuestionId()), revisedIds))
                .filter(a -> a != null)
                .toList();

        List<String> aiInsights = buildSessionInsights(
                session, byChapter, bySubject, byDifficulty, accuracyPercent, wrongAttempts.size());

        return new SessionResultView(
                view,
                timeTakenSeconds,
                accuracyPercent,
                countsForRank,
                subjectBreakdown,
                chapterBreakdown,
                weakInSession,
                strongInSession,
                aiInsights,
                wrongAttempts,
                reviews);
    }

    private WrongAttemptView toWrongAttemptView(QuestionAttempt a, Question q, Set<String> revisedIds) {
        if (q == null) {
            return null;
        }
        return new WrongAttemptView(
                a.getId(),
                a.getQuestionId(),
                a.getSessionId(),
                a.getPackId(),
                a.getMode() != null ? a.getMode() : MODE_PRACTICE,
                a.getSelectedAnswer(),
                validation.normalize(q.getAnswer()),
                q.getSubject(),
                q.getChapter(),
                q.getExam(),
                q.getYear(),
                q.getQuestionNo(),
                q.isHasSolution(),
                q.getSolutionImageUrl(),
                a.getAnsweredAt(),
                revisedIds.contains(a.getQuestionId()));
    }

    private static void trackBreakdown(
            Map<String, BreakdownStats> bySubject,
            Map<String, BreakdownStats> byChapter,
            Question q,
            boolean correct) {
        String subj = q.getSubject() != null ? q.getSubject() : "General";
        bySubject.computeIfAbsent(subj, BreakdownStats::forSubject).add(correct);
        String chapter = q.getChapter() != null && !q.getChapter().isBlank() ? q.getChapter() : "General";
        String chapterKey = subj + "\u0000" + chapter;
        byChapter.computeIfAbsent(chapterKey, k -> BreakdownStats.forChapter(subj, chapter)).add(correct);
    }

    private List<String> buildSessionInsights(
            PracticeSession session,
            Map<String, BreakdownStats> byChapter,
            Map<String, BreakdownStats> bySubject,
            Map<Integer, int[]> byDifficulty,
            int accuracyPercent,
            int wrongCount) {
        List<String> insights = new ArrayList<>();
        if (wrongCount == 0 && session.getSkipCount() == 0) {
            insights.add("Perfect run — every attempted question was correct.");
            return insights;
        }
        byChapter.values().stream()
                .filter(b -> b.wrong > 0)
                .max(Comparator.comparingInt(b -> b.wrong))
                .ifPresent(worst -> {
                    int pct = worst.wrong > 0 && (worst.correct + worst.wrong) > 0
                            ? (int) Math.round((worst.wrong * 100.0) / (worst.correct + worst.wrong))
                            : 0;
                    insights.add(worst.chapterLabel + " caused " + pct + "% of your mistakes in this session.");
                });
        int[] medium = byDifficulty.get(2);
        if (medium != null && medium[1] > medium[0]) {
            insights.add("Accuracy drops on medium difficulty questions — slow down and verify units.");
        }
        bySubject.values().stream()
                .filter(b -> b.attempts >= 2)
                .max(Comparator.comparingInt(BreakdownStats::accuracyPercent))
                .ifPresent(best -> insights.add("You perform best in " + best.subject + " (" + best.accuracyPercent() + "%)."));
        if (insights.isEmpty()) {
            insights.add("Session accuracy: " + accuracyPercent + "% — review wrong answers below.");
        }
        return insights.stream().limit(3).toList();
    }

    public List<WrongAttemptView> listWrongAttempts(
            String userId,
            String modeFilter,
            String subjectFilter,
            String chapterFilter,
            String examFilter,
            Integer yearFilter,
            String sessionIdFilter) {
        List<QuestionAttempt> wrong = attempts.findByUserIdOrderByAnsweredAtDesc(userId).stream()
                .filter(a -> !a.isCorrect())
                .filter(a -> {
                    if (modeFilter == null || modeFilter.isBlank() || "all".equalsIgnoreCase(modeFilter)) {
                        return countsForAnalytics(a);
                    }
                    String m = a.getMode() != null ? a.getMode() : MODE_PRACTICE;
                    return m.equalsIgnoreCase(modeFilter);
                })
                .limit(200)
                .toList();
        Set<String> qIds = wrong.stream().map(QuestionAttempt::getQuestionId).collect(Collectors.toSet());
        Map<String, Question> questionById = questions.findByQuestionIdIn(qIds).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q, (a, b) -> a));
        Set<String> revisedIds = revisionService.revisedQuestionIds(userId, qIds);
        List<WrongAttemptView> out = new ArrayList<>();
        for (QuestionAttempt a : wrong) {
            Question q = questionById.get(a.getQuestionId());
            if (q == null) {
                continue;
            }
            if (subjectFilter != null
                    && !subjectFilter.isBlank()
                    && !subjectFilter.equalsIgnoreCase(q.getSubject())) {
                continue;
            }
            if (chapterFilter != null
                    && !chapterFilter.isBlank()
                    && !chapterFilter.equalsIgnoreCase(q.getChapter())) {
                continue;
            }
            if (examFilter != null && !examFilter.isBlank() && !examFilter.equalsIgnoreCase(q.getExam())) {
                continue;
            }
            if (yearFilter != null && yearFilter > 0 && q.getYear() != yearFilter) {
                continue;
            }
            if (sessionIdFilter != null
                    && !sessionIdFilter.isBlank()
                    && !sessionIdFilter.equals(a.getSessionId())) {
                continue;
            }
            out.add(toWrongAttemptView(a, q, revisedIds));
        }
        return out.stream().limit(100).toList();
    }

    private SessionView sessionView(PracticeSession s) {
        String current = null;
        List<String> ids = s.getQuestionIds();
        if (ids != null && !ids.isEmpty() && s.getCurrentIndex() < ids.size()) {
            current = ids.get(s.getCurrentIndex());
        }
        Map<String, String> filters = s.getFilters() != null ? s.getFilters() : Map.of();
        List<QuestionAttempt> sessionAttempts = attempts.findBySessionId(s.getId());
        Map<String, QuestionAttempt> attemptByQ = sessionAttempts.stream()
                .collect(Collectors.toMap(QuestionAttempt::getQuestionId, a -> a, (a, b) -> b));
        Set<String> skipped = s.getSkippedQuestionIds() != null
                ? new java.util.HashSet<>(s.getSkippedQuestionIds())
                : Set.of();
        Set<String> marked = s.getMarkedForReviewIds() != null
                ? new java.util.HashSet<>(s.getMarkedForReviewIds())
                : Set.of();
        List<SessionQuestionTile> tiles = new ArrayList<>();
        if (ids != null) {
            for (int i = 0; i < ids.size(); i++) {
                String qid = ids.get(i);
                String status;
                QuestionAttempt att = attemptByQ.get(qid);
                if (att != null) {
                    status = att.isCorrect() ? "correct" : "wrong";
                } else if (skipped.contains(qid)) {
                    status = "skipped";
                } else if (marked.contains(qid)) {
                    status = "marked";
                } else if (qid.equals(current)) {
                    status = "current";
                } else {
                    status = "unattempted";
                }
                tiles.add(new SessionQuestionTile(i + 1, qid, status));
            }
        }
        return new SessionView(
                s.getId(),
                s.getPackId(),
                s.getExam(),
                s.getMode() != null ? s.getMode() : MODE_PRACTICE,
                s.getStatus(),
                ids != null ? ids.size() : 0,
                s.getCurrentIndex(),
                s.getCorrectCount(),
                s.getWrongCount(),
                s.getSkipCount(),
                s.getTotalMarks(),
                s.getMaxMarks(),
                s.getAdaptiveLevel(),
                s.getStartedAt(),
                s.getCompletedAt(),
                current,
                nullToEmpty(filters.get("subject")),
                nullToEmpty(filters.get("chapter")),
                nullToEmpty(filters.get("topic")),
                new ArrayList<>(marked),
                tiles);
    }

    public record CreateSessionRequest(
            String exam,
            String packId,
            String subject,
            String chapter,
            String topic,
            String difficulty,
            boolean adaptive,
            String startQuestionId,
            String mode,
            Integer questionCount) {}

    public record SessionQuestionTile(int number, String questionId, String status) {}

    public record WrongAttemptView(
            String attemptId,
            String questionId,
            String sessionId,
            String packId,
            String mode,
            String selectedAnswer,
            String correctAnswer,
            String subject,
            String chapter,
            String exam,
            int year,
            int questionNo,
            boolean hasSolution,
            String solutionImageUrl,
            Instant answeredAt,
            boolean revised) {}

    public record BreakdownRow(
            String label,
            String subject,
            String chapter,
            int correct,
            int wrong,
            int skipped,
            int accuracyPercent) {}

    public record SessionQuestionReview(
            int number,
            String questionId,
            String status,
            String selectedAnswer,
            String correctAnswer,
            boolean hasSolution,
            String solutionImageUrl,
            String subject,
            String chapter,
            int questionNo,
            int difficulty) {}

    public record SessionResultView(
            SessionView session,
            long timeTakenSeconds,
            int accuracyPercent,
            boolean countsForRank,
            List<BreakdownRow> subjectBreakdown,
            List<BreakdownRow> chapterBreakdown,
            List<ChapterProgress> weakChaptersInSession,
            List<ChapterProgress> strongChaptersInSession,
            List<String> aiInsights,
            List<WrongAttemptView> wrongAttempts,
            List<SessionQuestionReview> questionReviews) {}

    public record SubmitRequest(String sessionId, String questionId, String selectedAnswer) {}

    public record SkipRequest(String sessionId, String questionId) {}

    public record SubmitResult(
            boolean correct,
            String correctAnswer,
            int marksAwarded,
            int sessionTotalMarks,
            int sessionMaxMarks,
            int correctCount,
            int wrongCount,
            int skipCount,
            int adaptiveLevel,
            String sessionStatus,
            String nextQuestionId,
            String solutionImageUrl,
            boolean hasSolution) {}

    public record SkipResult(
            int skipCount,
            int correctCount,
            int wrongCount,
            int sessionTotalMarks,
            int sessionMaxMarks,
            int adaptiveLevel,
            String sessionStatus,
            String nextQuestionId) {}

    public record SessionView(
            String id,
            String packId,
            String exam,
            String mode,
            String status,
            int questionCount,
            int currentIndex,
            int correctCount,
            int wrongCount,
            int skipCount,
            int totalMarks,
            int maxMarks,
            int adaptiveLevel,
            Instant startedAt,
            Instant completedAt,
            String currentQuestionId,
            String filterSubject,
            String filterChapter,
            String filterTopic,
            List<String> markedForReviewIds,
            List<SessionQuestionTile> questionTiles) {}

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

    private static class BreakdownStats {
        final String subject;
        final String chapterLabel;
        int correct;
        int wrong;
        int skipped;
        int attempts;
        int marks;

        private BreakdownStats(String subject, String chapterLabel) {
            this.subject = subject;
            this.chapterLabel = chapterLabel;
        }

        static BreakdownStats forSubject(String subject) {
            return new BreakdownStats(subject, null);
        }

        static BreakdownStats forChapter(String subject, String chapter) {
            return new BreakdownStats(subject, chapter);
        }

        void add(boolean wasCorrect) {
            attempts++;
            if (wasCorrect) {
                correct++;
                marks += 4;
            } else {
                wrong++;
                marks -= 1;
            }
        }

        int accuracyPercent() {
            int total = correct + wrong;
            return total > 0 ? (int) Math.round((correct * 100.0) / total) : 0;
        }

        BreakdownRow toRow() {
            return new BreakdownRow(subject, subject, null, correct, wrong, skipped, accuracyPercent());
        }

        BreakdownRow toChapterRow() {
            return new BreakdownRow(chapterLabel, subject, chapterLabel, correct, wrong, skipped, accuracyPercent());
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

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}

package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.model.QuestionAttempt;
import com.neetlu.examhunt.model.RevisionQueueEntry;
import com.neetlu.examhunt.repository.QuestionAttemptRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import com.neetlu.examhunt.repository.RevisionQueueRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RevisionService {

    private final RevisionQueueRepository revisionQueue;
    private final QuestionRepository questions;
    private final QuestionAttemptRepository attempts;

    public RevisionService(
            RevisionQueueRepository revisionQueue,
            QuestionRepository questions,
            QuestionAttemptRepository attempts) {
        this.revisionQueue = revisionQueue;
        this.questions = questions;
        this.attempts = attempts;
    }

    public RevisionSummary summary(String userId) {
        long pending = revisionQueue.countByUserIdAndRevisedAtIsNull(userId);
        long revised = revisionQueue.countByUserIdAndRevisedAtIsNotNull(userId);
        return new RevisionSummary(pending, revised);
    }

    public List<RevisionItemView> list(String userId, String status) {
        List<RevisionQueueEntry> entries =
                "pending".equalsIgnoreCase(status)
                        ? revisionQueue.findByUserIdAndRevisedAtIsNullOrderByAddedAtDesc(userId)
                        : revisionQueue.findByUserIdOrderByAddedAtDesc(userId);
        if ("revised".equalsIgnoreCase(status)) {
            entries = entries.stream().filter(e -> e.getRevisedAt() != null).toList();
        }
        Set<String> qIds = entries.stream().map(RevisionQueueEntry::getQuestionId).collect(Collectors.toSet());
        Map<String, Question> qById = questions.findByQuestionIdIn(qIds).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q, (a, b) -> a));
        List<RevisionItemView> out = new ArrayList<>();
        for (RevisionQueueEntry e : entries) {
            Question q = qById.get(e.getQuestionId());
            if (q == null) {
                continue;
            }
            out.add(toView(e, q));
        }
        return out;
    }

    public RevisionItemView add(String userId, String questionId, String source, String wrongAttemptId, String sessionId) {
        Question q = questions.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        RevisionQueueEntry entry = revisionQueue.findByUserIdAndQuestionId(userId, questionId).orElseGet(() -> {
            RevisionQueueEntry e = new RevisionQueueEntry();
            e.setUserId(userId);
            e.setQuestionId(questionId);
            e.setAddedAt(Instant.now());
            return e;
        });
        entry.setPackId(q.getPackId());
        entry.setSource(source != null ? source : "manual");
        if (wrongAttemptId != null && !wrongAttemptId.isBlank()) {
            entry.setWrongAttemptId(wrongAttemptId);
        }
        if (sessionId != null && !sessionId.isBlank()) {
            entry.setSessionId(sessionId);
        }
        entry.setRevisedAt(null);
        revisionQueue.save(entry);
        return toView(entry, q);
    }

    public RevisionItemView markRevised(String userId, String questionId) {
        RevisionQueueEntry entry = revisionQueue
                .findByUserIdAndQuestionId(userId, questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not in revision queue"));
        entry.setRevisedAt(Instant.now());
        revisionQueue.save(entry);
        Question q = questions.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        return toView(entry, q);
    }

    public RevisionItemView markPending(String userId, String questionId) {
        RevisionQueueEntry entry = revisionQueue
                .findByUserIdAndQuestionId(userId, questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not in revision queue"));
        entry.setRevisedAt(null);
        revisionQueue.save(entry);
        Question q = questions.findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        return toView(entry, q);
    }

    public boolean isRevised(String userId, String questionId) {
        return revisionQueue
                .findByUserIdAndQuestionId(userId, questionId)
                .map(e -> e.getRevisedAt() != null)
                .orElse(false);
    }

    public Set<String> revisedQuestionIds(String userId, Set<String> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return Set.of();
        }
        return revisionQueue.findByUserIdAndQuestionIdIn(userId, questionIds).stream()
                .filter(e -> e.getRevisedAt() != null)
                .map(RevisionQueueEntry::getQuestionId)
                .collect(Collectors.toSet());
    }

    public Map<String, RevisionQueueEntry> entriesByQuestionIds(String userId, Set<String> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return Map.of();
        }
        return revisionQueue.findByUserIdAndQuestionIdIn(userId, questionIds).stream()
                .collect(Collectors.toMap(RevisionQueueEntry::getQuestionId, e -> e, (a, b) -> a));
    }

    public void enqueueWrongAttemptsForSession(String userId, String sessionId) {
        List<QuestionAttempt> wrong = attempts.findBySessionId(sessionId).stream()
                .filter(a -> !a.isCorrect())
                .toList();
        if (wrong.isEmpty()) {
            return;
        }
        Set<String> qIds = wrong.stream().map(QuestionAttempt::getQuestionId).collect(Collectors.toSet());
        Map<String, Question> qById = questions.findByQuestionIdIn(qIds).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q, (a, b) -> a));
        Map<String, RevisionQueueEntry> existing = revisionQueue.findByUserIdAndQuestionIdIn(userId, qIds).stream()
                .collect(Collectors.toMap(RevisionQueueEntry::getQuestionId, e -> e, (a, b) -> a));
        List<RevisionQueueEntry> toSave = new ArrayList<>();
        for (QuestionAttempt a : wrong) {
            Question q = qById.get(a.getQuestionId());
            if (q == null) {
                continue;
            }
            RevisionQueueEntry entry = existing.get(a.getQuestionId());
            if (entry == null) {
                entry = new RevisionQueueEntry();
                entry.setUserId(userId);
                entry.setQuestionId(a.getQuestionId());
                entry.setAddedAt(Instant.now());
                existing.put(a.getQuestionId(), entry);
            }
            entry.setPackId(q.getPackId());
            entry.setSource("wrong");
            if (a.getId() != null && !a.getId().isBlank()) {
                entry.setWrongAttemptId(a.getId());
            }
            entry.setSessionId(sessionId);
            entry.setRevisedAt(null);
            toSave.add(entry);
        }
        if (!toSave.isEmpty()) {
            revisionQueue.saveAll(toSave);
        }
    }

    private static RevisionItemView toView(RevisionQueueEntry e, Question q) {
        return new RevisionItemView(
                e.getQuestionId(),
                e.getPackId(),
                e.getSource(),
                e.getWrongAttemptId(),
                e.getSessionId(),
                q.getExam(),
                q.getYear(),
                q.getSubject(),
                q.getChapter(),
                q.getQuestionNo(),
                e.getAddedAt(),
                e.getRevisedAt(),
                e.getRevisedAt() == null);
    }

    public record RevisionSummary(long pending, long revised) {}

    public record RevisionItemView(
            String questionId,
            String packId,
            String source,
            String wrongAttemptId,
            String sessionId,
            String exam,
            int year,
            String subject,
            String chapter,
            int questionNo,
            Instant addedAt,
            Instant revisedAt,
            boolean pending) {}
}

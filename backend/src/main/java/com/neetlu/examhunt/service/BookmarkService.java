package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Bookmark;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.BookmarkRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final QuestionRepository questionRepository;
    private final PlatformSettingsService platformSettingsService;

    public BookmarkService(
            BookmarkRepository bookmarkRepository,
            QuestionRepository questionRepository,
            PlatformSettingsService platformSettingsService) {
        this.bookmarkRepository = bookmarkRepository;
        this.questionRepository = questionRepository;
        this.platformSettingsService = platformSettingsService;
    }

    public BookmarkView toggle(String userId, String questionId, String note) {
        requireBookmarksEnabled();
        Question q = questionRepository
                .findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        var existing = bookmarkRepository.findByUserIdAndQuestionId(userId, questionId);
        if (existing.isPresent()) {
            bookmarkRepository.deleteByUserIdAndQuestionId(userId, questionId);
            return new BookmarkView(questionId, false, null, 0);
        }
        Bookmark b = new Bookmark();
        b.setUserId(userId);
        b.setQuestionId(questionId);
        b.setPackId(q.getPackId());
        if (note != null && !note.isBlank()) {
            b.setNote(note.trim());
        }
        b.setSavedAt(Instant.now());
        bookmarkRepository.save(b);
        return new BookmarkView(questionId, true, b.getNote(), bookmarkRepository.countByUserId(userId));
    }

    public BookmarkStatus status(String userId, String questionId) {
        if (!platformSettingsService.requireSettings().isBookmarksEnabled()) {
            return new BookmarkStatus(questionId, false);
        }
        return bookmarkRepository
                .findByUserIdAndQuestionId(userId, questionId)
                .map(b -> new BookmarkStatus(questionId, true))
                .orElse(new BookmarkStatus(questionId, false));
    }

    public List<BookmarkItemView> list(String userId) {
        requireBookmarksEnabled();
        List<Bookmark> bookmarks = bookmarkRepository.findByUserIdOrderBySavedAtDesc(userId);
        if (bookmarks.isEmpty()) {
            return List.of();
        }
        var ids = bookmarks.stream().map(Bookmark::getQuestionId).toList();
        Map<String, Question> byId = questionRepository.findByQuestionIdIn(ids).stream()
                .collect(Collectors.toMap(Question::getQuestionId, q -> q));
        List<BookmarkItemView> out = new ArrayList<>();
        for (Bookmark b : bookmarks) {
            Question q = byId.get(b.getQuestionId());
            if (q == null) continue;
            out.add(new BookmarkItemView(
                    b.getQuestionId(),
                    b.getPackId(),
                    q.getQuestionNo(),
                    q.getExam(),
                    q.getYear(),
                    q.getSubject(),
                    q.getChapter(),
                    q.getTopic(),
                    q.getQuestionTextPreview(),
                    b.getNote(),
                    b.getSavedAt().toString()));
        }
        return out;
    }

    public Map<String, Object> seedSampleBookmarks(String userId, int limit) {
        requireBookmarksEnabled();
        List<Question> sample = questionRepository.findAll().stream().limit(Math.min(limit, 12)).toList();
        int added = 0;
        for (Question q : sample) {
            if (bookmarkRepository.findByUserIdAndQuestionId(userId, q.getQuestionId()).isPresent()) {
                continue;
            }
            Bookmark b = new Bookmark();
            b.setUserId(userId);
            b.setQuestionId(q.getQuestionId());
            b.setPackId(q.getPackId());
            b.setNote("Demo revision");
            b.setSavedAt(Instant.now());
            bookmarkRepository.save(b);
            added++;
        }
        return Map.of("added", added, "total", bookmarkRepository.countByUserId(userId));
    }

    public Map<String, Object> clearUserBookmarks(String userId) {
        List<Bookmark> all = bookmarkRepository.findByUserIdOrderBySavedAtDesc(userId);
        bookmarkRepository.deleteAll(all);
        return Map.of("removed", all.size());
    }

    private void requireBookmarksEnabled() {
        if (!platformSettingsService.requireSettings().isBookmarksEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bookmarks are disabled");
        }
    }

    public record BookmarkView(String questionId, boolean saved, String note, long totalBookmarks) {}

    public record BookmarkStatus(String questionId, boolean saved) {}

    public record BookmarkItemView(
            String questionId,
            String packId,
            int questionNo,
            String exam,
            int year,
            String subject,
            String chapter,
            String topic,
            String questionTextPreview,
            String note,
            String savedAt) {}
}

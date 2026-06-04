package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.PlatformSettings;
import com.neetlu.examhunt.repository.PlatformSettingsRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class PlatformSettingsService {

    private final PlatformSettingsRepository repository;

    public PlatformSettingsService(PlatformSettingsRepository repository) {
        this.repository = repository;
    }

    public PlatformSettings requireSettings() {
        return repository.findById(PlatformSettings.DEFAULT_ID).orElseGet(this::createDefaults);
    }

    private PlatformSettings createDefaults() {
        PlatformSettings s = new PlatformSettings();
        s.setId(PlatformSettings.DEFAULT_ID);
        return repository.save(s);
    }

    public PublicSettingsView toPublicView(PlatformSettings s) {
        return new PublicSettingsView(
                s.getMarketingPyqFloor(),
                s.getDisplayTotalQuestions(),
                s.getDisplayChapters(),
                List.copyOf(s.getBankSearchSuggestions()),
                s.getLearningInsightText(),
                s.getLearningInsightHighlight(),
                s.isAiTutorMockEnabled(),
                s.getAiTutorWelcome(),
                s.isBookmarksEnabled(),
                s.isAiSuggestEnabled());
    }

    public AdminSettingsView toAdminView(PlatformSettings s) {
        return new AdminSettingsView(
                toPublicView(s),
                List.copyOf(s.getAiTutorFallbackReplies()),
                Map.copyOf(s.getAiTutorKeywordReplies()));
    }

    public AdminSettingsView update(UpdateSettingsRequest req) {
        PlatformSettings s = requireSettings();
        if (req.marketingPyqFloor() != null) {
            s.setMarketingPyqFloor(Math.max(0, req.marketingPyqFloor()));
        }
        if (req.displayTotalQuestions() != null) {
            s.setDisplayTotalQuestions(req.displayTotalQuestions() <= 0 ? null : req.displayTotalQuestions());
        }
        if (req.displayChapters() != null) {
            s.setDisplayChapters(req.displayChapters() <= 0 ? null : req.displayChapters());
        }
        if (req.bankSearchSuggestions() != null) {
            s.setBankSearchSuggestions(req.bankSearchSuggestions());
        }
        if (req.learningInsightText() != null) {
            s.setLearningInsightText(req.learningInsightText());
        }
        if (req.learningInsightHighlight() != null) {
            s.setLearningInsightHighlight(req.learningInsightHighlight());
        }
        if (req.aiTutorMockEnabled() != null) {
            s.setAiTutorMockEnabled(req.aiTutorMockEnabled());
        }
        if (req.aiTutorWelcome() != null) {
            s.setAiTutorWelcome(req.aiTutorWelcome());
        }
        if (req.aiTutorFallbackReplies() != null) {
            s.setAiTutorFallbackReplies(req.aiTutorFallbackReplies());
        }
        if (req.aiTutorKeywordReplies() != null) {
            s.setAiTutorKeywordReplies(req.aiTutorKeywordReplies());
        }
        if (req.bookmarksEnabled() != null) {
            s.setBookmarksEnabled(req.bookmarksEnabled());
        }
        if (req.aiSuggestEnabled() != null) {
            s.setAiSuggestEnabled(req.aiSuggestEnabled());
        }
        return toAdminView(repository.save(s));
    }

    public record PublicSettingsView(
            int marketingPyqFloor,
            Integer displayTotalQuestions,
            Integer displayChapters,
            List<String> bankSearchSuggestions,
            String learningInsightText,
            String learningInsightHighlight,
            boolean aiTutorMockEnabled,
            String aiTutorWelcome,
            boolean bookmarksEnabled,
            boolean aiSuggestEnabled) {}

    public record AdminSettingsView(PublicSettingsView publicSettings, List<String> aiTutorFallbackReplies, Map<String, String> aiTutorKeywordReplies) {}

    public record UpdateSettingsRequest(
            Integer marketingPyqFloor,
            Integer displayTotalQuestions,
            Integer displayChapters,
            List<String> bankSearchSuggestions,
            String learningInsightText,
            String learningInsightHighlight,
            Boolean aiTutorMockEnabled,
            String aiTutorWelcome,
            List<String> aiTutorFallbackReplies,
            Map<String, String> aiTutorKeywordReplies,
            Boolean bookmarksEnabled,
            Boolean aiSuggestEnabled) {}
}

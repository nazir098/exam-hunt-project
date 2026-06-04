package com.neetlu.examhunt.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "platform_settings")
public class PlatformSettings {

    public static final String DEFAULT_ID = "default";

    @Id
    private String id = DEFAULT_ID;
    private int marketingPyqFloor = 25_000;
    private Integer displayTotalQuestions;
    private Integer displayChapters;
    private List<String> bankSearchSuggestions = new ArrayList<>(List.of(
            "Rotational Dynamics", "Optics", "Organic Chemistry"));
    private String learningInsightText =
            "Based on your last mock, you should focus on trends from recent PYQs.";
    private String learningInsightHighlight = "Inorganic Chemistry";
    private boolean aiTutorMockEnabled = true;
    private String aiTutorWelcome =
            "Hi! I'm your AI Tutor (demo mode). Ask about any NEET topic or PYQ concept.";
    private List<String> aiTutorFallbackReplies = new ArrayList<>(List.of(
            "Break the problem into given data, unknowns, and which formula links them.",
            "Review the official solution image, then try a similar PYQ from the same chapter.",
            "Your Analytics weak chapters are the best place to drill next — open Practice from there."));
    private Map<String, String> aiTutorKeywordReplies = defaultKeywordReplies();
    private boolean bookmarksEnabled = true;
    private boolean aiSuggestEnabled = true;

    private static Map<String, String> defaultKeywordReplies() {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("rotation|torque|angular", "For rotation, draw the axis first, then τ = Iα and conservation of L when net τ_ext = 0.");
        m.put("optics|lens|mirror", "Use sign convention consistently; for mirrors f = R/2. Ray diagrams beat memorizing alone.");
        m.put("organic|reaction|mechanism", "Name the functional group, then map to NEET-favorite mechanisms (SN1/SN2, electrophilic addition, etc.).");
        m.put("hint|help", "State what you've tried so far — I'll suggest the next conceptual step (demo tutor).");
        return m;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getMarketingPyqFloor() {
        return marketingPyqFloor;
    }

    public void setMarketingPyqFloor(int marketingPyqFloor) {
        this.marketingPyqFloor = marketingPyqFloor;
    }

    public Integer getDisplayTotalQuestions() {
        return displayTotalQuestions;
    }

    public void setDisplayTotalQuestions(Integer displayTotalQuestions) {
        this.displayTotalQuestions = displayTotalQuestions;
    }

    public Integer getDisplayChapters() {
        return displayChapters;
    }

    public void setDisplayChapters(Integer displayChapters) {
        this.displayChapters = displayChapters;
    }

    public List<String> getBankSearchSuggestions() {
        return bankSearchSuggestions;
    }

    public void setBankSearchSuggestions(List<String> bankSearchSuggestions) {
        this.bankSearchSuggestions = bankSearchSuggestions;
    }

    public String getLearningInsightText() {
        return learningInsightText;
    }

    public void setLearningInsightText(String learningInsightText) {
        this.learningInsightText = learningInsightText;
    }

    public String getLearningInsightHighlight() {
        return learningInsightHighlight;
    }

    public void setLearningInsightHighlight(String learningInsightHighlight) {
        this.learningInsightHighlight = learningInsightHighlight;
    }

    public boolean isAiTutorMockEnabled() {
        return aiTutorMockEnabled;
    }

    public void setAiTutorMockEnabled(boolean aiTutorMockEnabled) {
        this.aiTutorMockEnabled = aiTutorMockEnabled;
    }

    public String getAiTutorWelcome() {
        return aiTutorWelcome;
    }

    public void setAiTutorWelcome(String aiTutorWelcome) {
        this.aiTutorWelcome = aiTutorWelcome;
    }

    public List<String> getAiTutorFallbackReplies() {
        return aiTutorFallbackReplies;
    }

    public void setAiTutorFallbackReplies(List<String> aiTutorFallbackReplies) {
        this.aiTutorFallbackReplies = aiTutorFallbackReplies;
    }

    public Map<String, String> getAiTutorKeywordReplies() {
        return aiTutorKeywordReplies;
    }

    public void setAiTutorKeywordReplies(Map<String, String> aiTutorKeywordReplies) {
        this.aiTutorKeywordReplies = aiTutorKeywordReplies;
    }

    public boolean isBookmarksEnabled() {
        return bookmarksEnabled;
    }

    public void setBookmarksEnabled(boolean bookmarksEnabled) {
        this.bookmarksEnabled = bookmarksEnabled;
    }

    public boolean isAiSuggestEnabled() {
        return aiSuggestEnabled;
    }

    public void setAiSuggestEnabled(boolean aiSuggestEnabled) {
        this.aiSuggestEnabled = aiSuggestEnabled;
    }
}

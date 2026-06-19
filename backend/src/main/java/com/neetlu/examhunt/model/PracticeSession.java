package com.neetlu.examhunt.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "practice_sessions")
public class PracticeSession {

    @Id
    private String id;
    private String userId;
    private String exam;
    private String packId;
    private Map<String, String> filters = new HashMap<>();
    private List<String> questionIds = new ArrayList<>();
    private int currentIndex;
    private int adaptiveLevel = 2;
    private int correctCount;
    private int wrongCount;
    private int skipCount;
    /** practice | test */
    private String mode = "practice";
    private List<String> skippedQuestionIds = new ArrayList<>();
    /** Test submit: questions never answered, auto-marked at finish (not user skip). */
    private List<String> unansweredQuestionIds = new ArrayList<>();
    private List<String> markedForReviewIds = new ArrayList<>();
    private int totalMarks;
    private int maxMarks;
    private String status = "active";
    private Instant startedAt = Instant.now();
    private Instant completedAt;
    /** Seconds spent on the session page (timer paused when user navigates away). */
    private int activeSeconds;
    /** Non-null while the user is on a session question route. */
    private Instant engagedSince;
    private Instant lastDisengagedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getExam() {
        return exam;
    }

    public void setExam(String exam) {
        this.exam = exam;
    }

    public String getPackId() {
        return packId;
    }

    public void setPackId(String packId) {
        this.packId = packId;
    }

    public Map<String, String> getFilters() {
        return filters;
    }

    public void setFilters(Map<String, String> filters) {
        this.filters = filters;
    }

    public List<String> getQuestionIds() {
        return questionIds;
    }

    public void setQuestionIds(List<String> questionIds) {
        this.questionIds = questionIds;
    }

    public int getCurrentIndex() {
        return currentIndex;
    }

    public void setCurrentIndex(int currentIndex) {
        this.currentIndex = currentIndex;
    }

    public int getAdaptiveLevel() {
        return adaptiveLevel;
    }

    public void setAdaptiveLevel(int adaptiveLevel) {
        this.adaptiveLevel = adaptiveLevel;
    }

    public int getCorrectCount() {
        return correctCount;
    }

    public void setCorrectCount(int correctCount) {
        this.correctCount = correctCount;
    }

    public int getWrongCount() {
        return wrongCount;
    }

    public void setWrongCount(int wrongCount) {
        this.wrongCount = wrongCount;
    }

    public int getSkipCount() {
        return skipCount;
    }

    public void setSkipCount(int skipCount) {
        this.skipCount = skipCount;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public List<String> getSkippedQuestionIds() {
        return skippedQuestionIds;
    }

    public void setSkippedQuestionIds(List<String> skippedQuestionIds) {
        this.skippedQuestionIds = skippedQuestionIds != null ? skippedQuestionIds : new ArrayList<>();
    }

    public List<String> getUnansweredQuestionIds() {
        return unansweredQuestionIds;
    }

    public void setUnansweredQuestionIds(List<String> unansweredQuestionIds) {
        this.unansweredQuestionIds = unansweredQuestionIds != null ? unansweredQuestionIds : new ArrayList<>();
    }

    public List<String> getMarkedForReviewIds() {
        return markedForReviewIds;
    }

    public void setMarkedForReviewIds(List<String> markedForReviewIds) {
        this.markedForReviewIds = markedForReviewIds != null ? markedForReviewIds : new ArrayList<>();
    }

    public int getTotalMarks() {
        return totalMarks;
    }

    public void setTotalMarks(int totalMarks) {
        this.totalMarks = totalMarks;
    }

    public int getMaxMarks() {
        return maxMarks;
    }

    public void setMaxMarks(int maxMarks) {
        this.maxMarks = maxMarks;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public int getActiveSeconds() {
        return activeSeconds;
    }

    public void setActiveSeconds(int activeSeconds) {
        this.activeSeconds = activeSeconds;
    }

    public Instant getEngagedSince() {
        return engagedSince;
    }

    public void setEngagedSince(Instant engagedSince) {
        this.engagedSince = engagedSince;
    }

    public Instant getLastDisengagedAt() {
        return lastDisengagedAt;
    }

    public void setLastDisengagedAt(Instant lastDisengagedAt) {
        this.lastDisengagedAt = lastDisengagedAt;
    }
}

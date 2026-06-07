package com.neetlu.examhunt.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "revision_queue")
@CompoundIndex(name = "user_question_revision", def = "{'userId': 1, 'questionId': 1}", unique = true)
public class RevisionQueueEntry {

    @Id
    private String id;
    private String userId;
    private String questionId;
    private String packId;
    private String source = "manual";
    private String wrongAttemptId;
    private String sessionId;
    private Instant addedAt = Instant.now();
    private Instant revisedAt;

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

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public String getPackId() {
        return packId;
    }

    public void setPackId(String packId) {
        this.packId = packId;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getWrongAttemptId() {
        return wrongAttemptId;
    }

    public void setWrongAttemptId(String wrongAttemptId) {
        this.wrongAttemptId = wrongAttemptId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public Instant getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(Instant addedAt) {
        this.addedAt = addedAt;
    }

    public Instant getRevisedAt() {
        return revisedAt;
    }

    public void setRevisedAt(Instant revisedAt) {
        this.revisedAt = revisedAt;
    }

    public boolean isPending() {
        return revisedAt == null;
    }
}

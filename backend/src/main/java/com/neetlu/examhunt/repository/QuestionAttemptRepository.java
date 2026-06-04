package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.QuestionAttempt;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionAttemptRepository extends MongoRepository<QuestionAttempt, String> {
    List<QuestionAttempt> findByUserIdOrderByAnsweredAtDesc(String userId);
    List<QuestionAttempt> findBySessionId(String sessionId);
    Optional<QuestionAttempt> findBySessionIdAndQuestionId(String sessionId, String questionId);
    long countByUserIdAndCorrect(String userId, boolean correct);
    long countByUserId(String userId);
    void deleteByUserId(String userId);
}

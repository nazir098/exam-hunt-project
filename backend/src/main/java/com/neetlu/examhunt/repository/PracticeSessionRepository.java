package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.PracticeSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PracticeSessionRepository extends MongoRepository<PracticeSession, String> {
    Optional<PracticeSession> findByIdAndUserId(String id, String userId);
    List<PracticeSession> findByUserIdOrderByStartedAtDesc(String userId);
}

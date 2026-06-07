package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.RevisionQueueEntry;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RevisionQueueRepository extends MongoRepository<RevisionQueueEntry, String> {
    List<RevisionQueueEntry> findByUserIdOrderByAddedAtDesc(String userId);

    List<RevisionQueueEntry> findByUserIdAndRevisedAtIsNullOrderByAddedAtDesc(String userId);

    Optional<RevisionQueueEntry> findByUserIdAndQuestionId(String userId, String questionId);

    List<RevisionQueueEntry> findByUserIdAndQuestionIdIn(String userId, Collection<String> questionIds);

    long countByUserIdAndRevisedAtIsNull(String userId);

    long countByUserIdAndRevisedAtIsNotNull(String userId);
}

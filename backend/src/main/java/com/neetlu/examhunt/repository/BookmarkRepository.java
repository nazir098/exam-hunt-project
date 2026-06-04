package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.Bookmark;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends MongoRepository<Bookmark, String> {

    Optional<Bookmark> findByUserIdAndQuestionId(String userId, String questionId);

    List<Bookmark> findByUserIdOrderBySavedAtDesc(String userId);

    long countByUserId(String userId);

    void deleteByUserIdAndQuestionId(String userId, String questionId);
}

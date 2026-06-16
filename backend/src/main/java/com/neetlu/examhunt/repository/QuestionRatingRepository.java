package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.QuestionRating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionRatingRepository extends MongoRepository<QuestionRating, String> {
    Optional<QuestionRating> findByUserIdAndQuestionId(String userId, String questionId);
    List<QuestionRating> findByQuestionId(String questionId);
    Page<QuestionRating> findAllByOrderByRatedAtDesc(Pageable pageable);
    Page<QuestionRating> findByQuestionIdOrderByRatedAtDesc(String questionId, Pageable pageable);
}

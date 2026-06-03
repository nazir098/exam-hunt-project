package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface QuestionRepository extends MongoRepository<Question, String> {

    Optional<Question> findByQuestionId(String questionId);

    Page<Question> findByPackId(String packId, Pageable pageable);

    Page<Question> findByPackIdAndSubjectIgnoreCase(String packId, String subject, Pageable pageable);

    Page<Question> findByPackIdAndSubjectIgnoreCaseAndChapterIgnoreCase(
            String packId, String subject, String chapter, Pageable pageable);

    long countByPackId(String packId);

    void deleteByPackId(String packId);
}

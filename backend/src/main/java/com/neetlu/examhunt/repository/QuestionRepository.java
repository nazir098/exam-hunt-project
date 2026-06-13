package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends MongoRepository<Question, String> {

    Optional<Question> findByQuestionId(String questionId);

    List<Question> findByQuestionIdIn(Collection<String> questionIds);

    Page<Question> findByPackId(String packId, Pageable pageable);

    Page<Question> findByPackIdAndSubjectIgnoreCase(String packId, String subject, Pageable pageable);

    Page<Question> findByPackIdAndSubjectIgnoreCaseAndChapterIgnoreCase(
            String packId, String subject, String chapter, Pageable pageable);

    long countByPackId(String packId);

    long countByPackIdAndSourceType(String packId, String sourceType);

    List<Question> findByParentQuestionIdOrderByVariantNoAsc(String parentQuestionId);

    List<Question> findByParentQuestionIdAndPackIdOrderByVariantNoAsc(
            String parentQuestionId, String packId);

    List<Question> findByParentQuestionIdAndPackIdAndVariantNo(
            String parentQuestionId, String packId, int variantNo);

    void deleteByPackId(String packId);

    @Query(
            """
            { 'packId': ?0, '$or': [
              { 'questionTextPreview': { $regex: ?1, $options: 'i' } },
              { 'subject': { $regex: ?1, $options: 'i' } },
              { 'chapter': { $regex: ?1, $options: 'i' } },
              { 'topic': { $regex: ?1, $options: 'i' } }
            ]}
            """)
    Page<Question> searchInPack(String packId, String pattern, Pageable pageable);

    @Query(
            """
            { 'exam': ?0, '$or': [
              { 'questionTextPreview': { $regex: ?1, $options: 'i' } },
              { 'subject': { $regex: ?1, $options: 'i' } },
              { 'chapter': { $regex: ?1, $options: 'i' } },
              { 'topic': { $regex: ?1, $options: 'i' } }
            ]}
            """)
    Page<Question> searchByExam(String exam, String pattern, Pageable pageable);

    List<Question> findByPackIdAndSubjectIgnoreCaseAndChapterIgnoreCaseAndQuestionIdNot(
            String packId, String subject, String chapter, String questionId, Pageable pageable);

    List<Question> findByPackIdAndSubjectIgnoreCaseAndQuestionIdNot(
            String packId, String subject, String questionId, Pageable pageable);

    List<Question>
            findByExamIgnoreCaseAndSubjectIgnoreCaseAndChapterIgnoreCaseAndTopicIgnoreCaseAndSubtopicIgnoreCaseAndQuestionIdNot(
                    String exam,
                    String subject,
                    String chapter,
                    String topic,
                    String subtopic,
                    String questionId,
                    Pageable pageable);

    List<Question> findByExamIgnoreCaseAndSubjectIgnoreCaseAndChapterIgnoreCaseAndTopicIgnoreCaseAndQuestionIdNot(
            String exam, String subject, String chapter, String topic, String questionId, Pageable pageable);

    List<Question> findByExamIgnoreCaseAndSubjectIgnoreCaseAndChapterIgnoreCaseAndQuestionIdNot(
            String exam, String subject, String chapter, String questionId, Pageable pageable);

    List<Question> findByExamIgnoreCaseAndSubjectIgnoreCaseAndQuestionIdNot(
            String exam, String subject, String questionId, Pageable pageable);

    @Query(
            """
            { 'exam': ?0,
              'subject': { $regex: '^?1$', $options: 'i' },
              'chapter': { $regex: '^?2$', $options: 'i' },
              'topic': { $regex: '^?3$', $options: 'i' },
              'practicePattern': { $exists: true, $nin: [null, ''] }
            }
            """)
    Optional<Question> findFirstWithPracticePatternForTopic(
            String exam, String subject, String chapter, String topic);
}

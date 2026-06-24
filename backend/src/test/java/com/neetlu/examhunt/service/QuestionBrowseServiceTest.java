package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QuestionBrowseServiceTest {

    @Test
    void ranksTopicMatchesAboveUnrelatedQuestions() {
        Question optics = question(12, "Physics", "Optics", "Ray Optics");
        Question rotation = question(45, "Physics", "Mechanics", "Rotational Dynamics");
        Question organic = question(8, "Chemistry", "Organic", "Hydrocarbons");

        List<QuestionBrowseService.ScoredQuestion> ranked = QuestionBrowseService.rankQuestions(
                List.of(organic, rotation, optics),
                "optics",
                null,
                null,
                null,
                null,
                1
        );

        assertEquals(1, ranked.size());
        assertEquals("Ray Optics", ranked.get(0).question().getTopic());
    }

    @Test
    void ranksQuestionNumberMatchesHighly() {
        Question exact = question(45, "Biology", "Morphology", "Frog");
        Question near = question(44, "Biology", "Morphology", "Frog");
        Question far = question(10, "Biology", "Morphology", "Frog");

        List<QuestionBrowseService.ScoredQuestion> ranked = QuestionBrowseService.rankQuestions(
                List.of(far, near, exact),
                "",
                45,
                null,
                null,
                null,
                1
        );

        assertEquals(45, ranked.get(0).question().getQuestionNo());
        assertEquals(44, ranked.get(1).question().getQuestionNo());
    }

    @Test
    void fuzzyMatchesTypoInTopic() {
        Question rotation = question(45, "Physics", "Mechanics", "Rotational Dynamics");

        List<QuestionBrowseService.ScoredQuestion> ranked = QuestionBrowseService.rankQuestions(
                List.of(rotation),
                "rotational dynamic",
                null,
                null,
                null,
                null,
                1
        );

        assertEquals(1, ranked.size());
        assertTrue(ranked.get(0).score() > 0);
    }

    private static Question question(int no, String subject, String chapter, String topic) {
        Question q = new Question();
        q.setQuestionNo(no);
        q.setSubject(subject);
        q.setChapter(chapter);
        q.setTopic(topic);
        q.setQuestionTextPreview(topic + " question preview");
        return q;
    }
}

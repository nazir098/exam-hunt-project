package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.Question;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionDetailSecurityTest {

    @Test
    void publicDetailRedactsAnswersAndSolutions() {
        Question q = new Question();
        q.setQuestionId("NEET_2020_PHY_01");
        q.setPackId("NEET_2020");
        q.setQuestionNo(1);
        q.setExam("NEET");
        q.setYear(2020);
        q.setAnswer("2");
        q.setSubject("Physics");
        q.setChapter("Mechanics");
        q.setTopic("Motion");
        q.setDifficulty(2);
        q.setHasSolution(true);
        q.setSolutionTextPreview("Use v = u + at");
        q.setSolutionImageUrl("https://cdn.example/sol.png");
        q.setSolutionDiagramSvg("<svg></svg>");
        q.setQuestionTextPreview("A ball is thrown upward");

        QuestionController.QuestionDetail redacted =
                QuestionController.QuestionDetail.from(q, false);

        assertThat(redacted.answer()).isEmpty();
        assertThat(redacted.solutionTextPreview()).isEmpty();
        assertThat(redacted.solutionImageUrl()).isEmpty();
        assertThat(redacted.solutionDiagramSvg()).isEmpty();
        assertThat(redacted.questionTextPreview()).isEqualTo("A ball is thrown upward");
    }

    @Test
    void authenticatedDetailIncludesAnswersAndSolutions() {
        Question q = new Question();
        q.setQuestionId("NEET_2020_PHY_01");
        q.setPackId("NEET_2020");
        q.setQuestionNo(1);
        q.setExam("NEET");
        q.setYear(2020);
        q.setAnswer("2");
        q.setHasSolution(true);
        q.setSolutionTextPreview("Use v = u + at");
        q.setSolutionImageUrl("https://cdn.example/sol.png");
        q.setSolutionDiagramSvg("<svg></svg>");

        QuestionController.QuestionDetail full = QuestionController.QuestionDetail.from(q, true);

        assertThat(full.answer()).isEqualTo("2");
        assertThat(full.solutionTextPreview()).isEqualTo("Use v = u + at");
        assertThat(full.solutionImageUrl()).isEqualTo("https://cdn.example/sol.png");
        assertThat(full.solutionDiagramSvg()).isEqualTo("<svg></svg>");
    }
}

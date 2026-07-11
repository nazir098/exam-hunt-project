package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.Question;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionPublicSecurityTest {

    @Test
    void publicListRedactsSolutionImageUrl() {
        Question q = new Question();
        q.setQuestionId("NEET_2025_CHEM_85");
        q.setPackId("NEET_2025");
        q.setQuestionNo(85);
        q.setHasSolution(true);
        q.setSolutionImageUrl("https://cdn.example/sol.png");
        q.setQuestionTextPreview("Thermochemical equation question");

        QuestionController.QuestionPublic redacted = QuestionController.QuestionPublic.from(q, false);

        assertThat(redacted.hasSolution()).isTrue();
        assertThat(redacted.solutionImageUrl()).isEmpty();
        assertThat(redacted.questionTextPreview()).isEqualTo("Thermochemical equation question");
    }

    @Test
    void authenticatedListIncludesSolutionImageUrl() {
        Question q = new Question();
        q.setQuestionId("NEET_2025_CHEM_85");
        q.setHasSolution(true);
        q.setSolutionImageUrl("https://cdn.example/sol.png");

        QuestionController.QuestionPublic full = QuestionController.QuestionPublic.from(q, true);

        assertThat(full.solutionImageUrl()).isEqualTo("https://cdn.example/sol.png");
    }
}

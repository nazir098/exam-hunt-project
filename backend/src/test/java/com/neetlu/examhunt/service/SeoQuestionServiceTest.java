package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SeoQuestionServiceTest {

    @Test
    void indexableWhenStructuredTextStemExists() {
        Question q = baseQuestion();
        q.setRenderMode("structured");
        q.setQuestionTextPreview("The standard heat of formation of $Ba^{2+}$ is:");
        assertThat(SeoQuestionService.isIndexable(q)).isTrue();
    }

    @Test
    void notIndexableForAiVariants() {
        Question q = baseQuestion();
        q.setSourceType("ai_variant");
        q.setRenderMode("structured");
        q.setQuestionTextPreview("Variant stem");
        assertThat(SeoQuestionService.isIndexable(q)).isFalse();
    }

    @Test
    void notIndexableForImageOnlyWithoutText() {
        Question q = baseQuestion();
        q.setRenderMode("image");
        q.setContentTextNormalized(false);
        q.setQuestionTextPreview("");
        q.setOptions(null);
        assertThat(SeoQuestionService.isIndexable(q)).isFalse();
    }

    private static Question baseQuestion() {
        Question q = new Question();
        q.setQuestionId("NEET_2025_CHEM_85");
        q.setSourceType("pyq");
        q.setExam("NEET");
        q.setYear(2025);
        q.setSubject("Chemistry");
        q.setChapter("Thermodynamics");
        q.setQuestionNo(85);
        q.setAnswer("1");
        q.setSolutionTextPreview("Use Hess law to find enthalpy of formation.");
        q.setOptions(java.util.List.of(option("1", "-128.5"), option("2", "-133.0")));
        return q;
    }

    private static McqOption option(String id, String text) {
        McqOption opt = new McqOption();
        opt.setId(id);
        opt.setText(text);
        return opt;
    }
}

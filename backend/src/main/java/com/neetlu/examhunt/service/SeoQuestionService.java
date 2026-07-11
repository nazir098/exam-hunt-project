package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class SeoQuestionService {

    private final QuestionRepository questionRepository;
    private final ManifestImportService manifestImportService;

    public SeoQuestionService(
            QuestionRepository questionRepository, ManifestImportService manifestImportService) {
        this.questionRepository = questionRepository;
        this.manifestImportService = manifestImportService;
    }

    public SeoQuestionView getIndexableQuestion(String questionId) {
        Question q = questionRepository
                .findByQuestionId(questionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        q = manifestImportService.enrichFromDisk(q);
        if (!isIndexable(q)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Question is not indexable");
        }
        return toView(q);
    }

    public static boolean isIndexable(Question q) {
        if (q == null) {
            return false;
        }
        String source = q.getSourceType() == null ? "pyq" : q.getSourceType().strip();
        if ("ai_variant".equalsIgnoreCase(source)) {
            return false;
        }
        if (!hasReadableStem(q)) {
            return false;
        }
        String mode = QuestionRenderMode.normalize(q.getRenderMode());
        return "structured".equals(mode) || "hybrid".equals(mode) || q.isContentTextNormalized();
    }

    private static boolean hasReadableStem(Question q) {
        String stem = q.getQuestionTextPreview();
        if (stem != null && !stem.isBlank()) {
            return true;
        }
        return q.getOptions() != null && !q.getOptions().isEmpty();
    }

    private static SeoQuestionView toView(Question q) {
        String exam = formatExam(q.getExam(), q.getYear());
        String topic = firstNonBlank(q.getTopic(), q.getChapter(), q.getSubject(), "NEET");
        String stemPlain = SeoTextUtil.toPlainText(q.getQuestionTextPreview());
        if (stemPlain.isBlank() && q.getOptions() != null) {
            stemPlain = q.getOptions().stream()
                    .map(o -> SeoTextUtil.toPlainText(o.getText()))
                    .filter(s -> !s.isBlank())
                    .findFirst()
                    .orElse("");
        }
        String questionSnippet = SeoTextUtil.excerpt(stemPlain, 120);
        String title = exam + " " + q.getSubject() + " Q" + q.getQuestionNo()
                + (questionSnippet.isBlank() ? "" : " - " + questionSnippet)
                + " | " + topic + " PYQ";
        String description = SeoTextUtil.excerpt(stemPlain, 160);
        if (description.isBlank()) {
            description = "NEET " + q.getSubject() + " previous year question " + q.getQuestionNo()
                    + " — practice with answer check and solution after sign-in.";
        }
        List<SeoOptionView> options = mapOptions(q);
        return new SeoQuestionView(
                q.getQuestionId(),
                title,
                description,
                stemPlain,
                options,
                hasRenderableSolution(q),
                exam,
                q.getYear(),
                q.getSubject(),
                q.getChapter(),
                q.getTopic(),
                q.getQuestionNo(),
                QuestionRenderMode.normalize(q.getRenderMode()),
                true);
    }

    private static boolean hasRenderableSolution(Question q) {
        if (q.isHasSolution()) {
            return true;
        }
        String image = q.getSolutionImageUrl();
        if (image != null && !image.isBlank()) {
            return true;
        }
        String text = q.getSolutionTextPreview();
        return text != null && !text.isBlank();
    }

    private static List<SeoOptionView> mapOptions(Question q) {
        if (q.getOptions() == null || q.getOptions().isEmpty()) {
            return List.of();
        }
        List<SeoOptionView> out = new ArrayList<>();
        for (int i = 0; i < q.getOptions().size(); i++) {
            var opt = q.getOptions().get(i);
            String id = opt.getId() == null ? String.valueOf(i + 1) : opt.getId().strip();
            String label = String.valueOf((char) ('A' + i));
            out.add(new SeoOptionView(id, label, SeoTextUtil.toPlainText(opt.getText())));
        }
        return out;
    }

    private static String formatExam(String exam, int year) {
        String name = exam == null || exam.isBlank() ? "NEET" : exam.strip();
        return year > 0 ? name + " " + year : name;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.strip();
            }
        }
        return "";
    }

    public record SeoOptionView(String id, String label, String textPlain) {}

    /** Public crawl metadata — no answers or solution bodies. */
    public record SeoQuestionView(
            String questionId,
            String title,
            String description,
            String questionTextPlain,
            List<SeoOptionView> options,
            boolean hasSolution,
            String exam,
            int year,
            String subject,
            String chapter,
            String topic,
            int questionNo,
            String renderMode,
            boolean indexable) {}
}

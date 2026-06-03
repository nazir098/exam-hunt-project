package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.ContentPack;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
public class ManifestImportService {

    private final ContentPackRepository packRepository;
    private final QuestionRepository questionRepository;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public ManifestImportService(
            ContentPackRepository packRepository,
            QuestionRepository questionRepository,
            AppProperties appProperties,
            ObjectMapper objectMapper) {
        this.packRepository = packRepository;
        this.questionRepository = questionRepository;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    public ImportResult importFromFolder(String folderName) throws IOException {
        JsonNode manifest = loadManifestFromDisk(folderName);
        return importManifestNode(manifest, folderName);
    }

    public ImportResult importAllPublishedFolders() throws IOException {
        Path outputRoot = resolveOutputRoot();
        if (!Files.isDirectory(outputRoot)) {
            throw new IOException("Extractor output not found: " + outputRoot);
        }
        List<ImportResult> results = new ArrayList<>();
        try (Stream<Path> dirs = Files.list(outputRoot)) {
            for (Path dir : dirs.filter(Files::isDirectory).toList()) {
                Path manifestPath = dir.resolve("published").resolve("manifest.json");
                if (!Files.isRegularFile(manifestPath)) {
                    continue;
                }
                JsonNode manifest = objectMapper.readTree(manifestPath.toFile());
                results.add(importManifestNode(manifest, dir.getFileName().toString()));
            }
        }
        int questions = results.stream().mapToInt(ImportResult::questionsImported).sum();
        return new ImportResult("ALL", questions, results.size(), results);
    }

    private JsonNode loadManifestFromDisk(String folderName) throws IOException {
        Path manifestPath = resolveOutputRoot()
                .resolve(folderName)
                .resolve("published")
                .resolve("manifest.json");
        if (!Files.isRegularFile(manifestPath)) {
            String baseUrl = appProperties.extractorManifestBaseUrl();
            if (baseUrl != null && !baseUrl.isBlank()) {
                String url = baseUrl.replaceAll("/$", "") + "/" + folderName + "/manifest";
                return objectMapper.readTree(restTemplate.getForObject(url, String.class));
            }
            throw new IOException("manifest.json not found: " + manifestPath);
        }
        return objectMapper.readTree(manifestPath.toFile());
    }

    private Path resolveOutputRoot() {
        String root = appProperties.extractorRoot();
        if (root == null || root.isBlank()) {
            throw new IllegalStateException("Set EXTRACTOR_ROOT to your pdf-qa-extractor project path");
        }
        return Path.of(root).resolve("output");
    }

    public ImportResult importManifestNode(JsonNode manifest, String sourceFolder) {
        String packId = text(manifest, "pack_id");
        if (packId.isBlank()) {
            packId = text(manifest, "exam") + "_" + manifest.path("year").asInt(0);
        }

        packRepository.deleteByPackId(packId);
        questionRepository.deleteByPackId(packId);

        ContentPack pack = new ContentPack();
        pack.setPackId(packId);
        pack.setSourceFolder(sourceFolder);
        pack.setExam(text(manifest, "exam"));
        pack.setYear(manifest.path("year").asInt(0));
        pack.setSourcePdf(text(manifest, "source_pdf"));
        pack.setFormat(text(manifest, "format"));
        if (manifest.hasNonNull("dpi")) {
            pack.setDpi(manifest.path("dpi").asInt());
        }
        pack.setPublishedAt(parseInstant(text(manifest, "published_at")));
        pack.setImportedAt(Instant.now());
        pack.setStats(jsonToMap(manifest.path("stats")));
        pack.setFacets(jsonToMap(manifest.path("facets")));
        packRepository.save(pack);

        int count = 0;
        for (JsonNode q : manifest.path("questions")) {
            Question doc = mapQuestion(q, packId);
            questionRepository.save(doc);
            count++;
        }

        return new ImportResult(packId, count, 1, List.of());
    }

    private Question mapQuestion(JsonNode q, String packId) {
        Question doc = new Question();
        doc.setQuestionId(text(q, "question_id"));
        doc.setPackId(packId);
        doc.setQuestionNo(q.path("question_no").asInt(0));
        doc.setExam(text(q, "exam"));
        doc.setYear(q.path("year").asInt(0));
        doc.setAnswer(text(q, "answer"));
        doc.setSubject(text(q, "subject"));
        doc.setChapter(text(q, "chapter"));
        doc.setTopic(text(q, "topic"));
        doc.setSubtopic(text(q, "subtopic"));
        doc.setDifficulty(q.path("difficulty").asInt(0));
        List<String> concepts = new ArrayList<>();
        q.path("concepts").forEach(c -> concepts.add(c.asText()));
        doc.setConcepts(concepts);
        doc.setHasDiagram(q.path("has_diagram").asBoolean(false));
        doc.setHasEquation(q.path("has_equation").asBoolean(false));
        doc.setHasSolution(q.path("has_solution").asBoolean(false));
        doc.setAnswerOnly(q.path("answer_only").asBoolean(false));
        doc.setQuestionImageUrl(text(q, "question_image_url"));
        doc.setSolutionImageUrl(text(q, "solution_image_url"));
        doc.setQuestionTextPreview(text(q, "question_text_preview"));
        doc.setSolutionTextPreview(text(q, "solution_text_preview"));
        return doc;
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).asText("");
    }

    private static Instant parseInstant(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        return Instant.parse(iso);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> jsonToMap(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return Map.of();
        }
        return objectMapper.convertValue(node, Map.class);
    }

    public record ImportResult(
            String packId,
            int questionsImported,
            int packsProcessed,
            List<ImportResult> details
    ) {}
}

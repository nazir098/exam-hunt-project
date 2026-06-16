package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.ContentPack;
import com.neetlu.examhunt.model.FormulaCard;
import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

@Service
public class ManifestImportService {

    private final ContentPackRepository packRepository;
    private final QuestionRepository questionRepository;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();
    private final Object importMonitor = new Object();

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
        synchronized (importMonitor) {
            String sourceFolder = normalizeSourceFolder(folderName);
            JsonNode manifest = loadManifest(sourceFolder);
            return importManifestNode(manifest, sourceFolder);
        }
    }

    /** Published extractor folders that have {@code output/<name>/published/manifest.json}. */
    public List<ImportFolderEntry> listImportableFolders() throws IOException {
        Optional<Path> outputRootOptional = resolveOutputRootOptional();
        if (outputRootOptional.isEmpty()) {
            return List.of();
        }
        Path outputRoot = outputRootOptional.get();
        if (!Files.isDirectory(outputRoot)) {
            return List.of();
        }
        List<ImportFolderEntry> entries = new ArrayList<>();
        try (Stream<Path> dirs = Files.list(outputRoot)) {
            for (Path dir : dirs.filter(Files::isDirectory).sorted().toList()) {
                Path manifestPath = dir.resolve("published").resolve("manifest.json");
                if (!Files.isRegularFile(manifestPath)) {
                    continue;
                }
                JsonNode manifest = objectMapper.readTree(manifestPath.toFile());
                String folderName = dir.getFileName().toString();
                String packId = text(manifest, "pack_id");
                if (packId.isBlank()) {
                    packId = text(manifest, "exam") + "_" + manifest.path("year").asInt(0);
                }
                int questionCount = manifest.path("questions").size();
                if (questionCount == 0 && manifest.path("stats").has("total_questions")) {
                    questionCount = manifest.path("stats").path("total_questions").asInt(0);
                }
                entries.add(new ImportFolderEntry(
                        folderName,
                        packId,
                        text(manifest, "exam"),
                        manifest.path("year").asInt(0),
                        questionCount));
            }
        }
        return entries;
    }

    /** Imports every published folder whose manifest {@code exam} is NEET. */
    public ImportResult importNeetFolders() throws IOException {
        synchronized (importMonitor) {
            Path outputRoot = resolveOutputRoot();
            if (!Files.isDirectory(outputRoot)) {
                throw new IOException("Extractor output not found: " + outputRoot);
            }
            List<ImportResult> results = new ArrayList<>();
            try (Stream<Path> dirs = Files.list(outputRoot)) {
                for (Path dir : dirs.filter(Files::isDirectory).sorted().toList()) {
                    Path manifestPath = dir.resolve("published").resolve("manifest.json");
                    if (!Files.isRegularFile(manifestPath)) {
                        continue;
                    }
                    JsonNode manifest = objectMapper.readTree(manifestPath.toFile());
                    if (!"NEET".equalsIgnoreCase(text(manifest, "exam"))) {
                        continue;
                    }
                    results.add(importManifestNode(manifest, dir.getFileName().toString()));
                }
            }
            if (results.isEmpty()) {
                throw new IOException(
                        "No NEET manifests under " + outputRoot + " — publish years in pdf-qa-extractor first.");
            }
            int questions = results.stream().mapToInt(ImportResult::questionsImported).sum();
            int variants = results.stream().mapToInt(ImportResult::variantsImported).sum();
            return new ImportResult("NEET", questions, variants, results.size(), results);
        }
    }

    public ImportResult importAllPublishedFolders() throws IOException {
        synchronized (importMonitor) {
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
            int variants = results.stream().mapToInt(ImportResult::variantsImported).sum();
            return new ImportResult("ALL", questions, variants, results.size(), results);
        }
    }

    private JsonNode loadManifest(String sourceFolder) throws IOException {
        Path manifestPath = resolveOutputRootOptional()
                .map(root -> localYearPath(root, sourceFolder)
                        .resolve("published")
                        .resolve("manifest.json"))
                .orElse(null);
        if (manifestPath != null && Files.isRegularFile(manifestPath)) {
            return objectMapper.readTree(manifestPath.toFile());
        }

        for (String normalizedBaseUrl : remoteManifestBaseUrls()) {
            for (String suffix : List.of("/manifest", "/manifest.json", "/published/manifest.json")) {
                try {
                    String body = restTemplate.getForObject(remoteYearUrl(normalizedBaseUrl, sourceFolder) + suffix, String.class);
                    if (body != null && !body.isBlank()) {
                        return objectMapper.readTree(body);
                    }
                } catch (Exception ignored) {
                    // Try the next supported manifest name.
                }
            }
        }

        Path expected = manifestPath != null
                ? manifestPath
                : Path.of("<EXTRACTOR_ROOT>", "output", sourceFolder, "published", "manifest.json");
        throw new IOException("manifest.json not found: " + expected);
    }

    private String normalizeSourceFolder(String folderName) {
        if (folderName == null) {
            return "";
        }
        String value = folderName.strip().replace('\\', '/');
        while (value.startsWith("/")) {
            value = value.substring(1);
        }
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        if (value.startsWith("output/")) {
            value = value.substring("output/".length());
        }
        int slash = value.indexOf('/');
        return slash >= 0 ? value.substring(0, slash) : value;
    }

    private Path localYearPath(Path outputRoot, String sourceFolder) {
        return outputRoot.resolve(sourceFolder);
    }

    private String remoteYearUrl(String baseUrl, String sourceFolder) {
        return baseUrl.replaceAll("/$", "") + "/" + sourceFolder;
    }

    private List<String> remoteManifestBaseUrls() {
        List<String> urls = new ArrayList<>();
        remoteExtractorBaseUrl().ifPresent(urls::add);
        remotePublicFilesBaseUrl().ifPresent(urls::add);
        return urls;
    }

    private Path resolveOutputRoot() {
        String root = appProperties.extractorRoot();
        if (root == null || root.isBlank()) {
            throw new IllegalStateException("Set EXTRACTOR_ROOT to your pdf-qa-extractor project path");
        }
        return Path.of(root).resolve("output");
    }

    private Optional<Path> resolveOutputRootOptional() {
        String root = appProperties.extractorRoot();
        if (root == null || root.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(Path.of(root).resolve("output"));
    }

    public RemovePackResult removePack(String packId) {
        synchronized (importMonitor) {
            if (packId == null || packId.isBlank()) {
                throw new IllegalArgumentException("packId is required");
            }
            List<ContentPack> rows = packRepository.findAllByPackId(packId);
            if (rows.isEmpty()) {
                throw new java.util.NoSuchElementException("Pack not found: " + packId);
            }
            long questionsRemoved = questionRepository.countByPackId(packId);
            questionRepository.deleteByPackId(packId);
            packRepository.deleteAll(rows);
            return new RemovePackResult(packId, questionsRemoved);
        }
    }

    /** Drop duplicate content_packs rows left from concurrent imports. */
    public int purgeDuplicateContentPacks() {
        synchronized (importMonitor) {
            List<ContentPack> all = packRepository.findAll();
            List<ContentPack> keepers = ContentPackCatalog.dedupeByPackId(all);
            Map<String, ContentPack> keeperByPackId = new LinkedHashMap<>();
            for (ContentPack keeper : keepers) {
                keeperByPackId.put(keeper.getPackId(), keeper);
            }
            List<ContentPack> toDelete = new ArrayList<>();
            for (ContentPack pack : all) {
                String packId = pack.getPackId();
                if (packId == null || packId.isBlank()) {
                    toDelete.add(pack);
                    continue;
                }
                ContentPack keeper = keeperByPackId.get(packId);
                if (keeper == null || !pack.getId().equals(keeper.getId())) {
                    toDelete.add(pack);
                }
            }
            if (!toDelete.isEmpty()) {
                packRepository.deleteAll(toDelete);
            }
            return toDelete.size();
        }
    }

    public ImportResult importManifestNode(JsonNode manifest, String sourceFolder) throws IOException {
        String packId = text(manifest, "pack_id");
        if (packId.isBlank()) {
            packId = text(manifest, "exam") + "_" + manifest.path("year").asInt(0);
        }

        List<Question> adminPreserve =
                questionRepository.findByPackId(packId, PageRequest.of(0, 50_000)).getContent().stream()
                        .map(AdminQuestionPreserve::copyPreserveState)
                        .filter(Objects::nonNull)
                        .toList();

        deleteAllPackRows(packId);
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
        Map<String, Object> stats = new LinkedHashMap<>(jsonToMap(manifest.path("stats")));
        Map<String, Object> facets = new LinkedHashMap<>(jsonToMap(manifest.path("facets")));

        int count = 0;
        for (JsonNode q : manifest.path("questions")) {
            Question doc = mapQuestion(q, packId);
            questionRepository.save(doc);
            count++;
        }

        int variantsImported = importAiVariants(sourceFolder, packId, manifest);
        restoreAdminPreservedFields(adminPreserve);
        stats.put("pyq_count", count);
        stats.put("variant_count", variantsImported);
        pack.setStats(stats);
        facets.put("variant_count", variantsImported);
        pack.setFacets(facets);
        packRepository.save(pack);
        purgeDuplicateContentPacks();

        return new ImportResult(packId, count, variantsImported, 1, List.of());
    }

    private void deleteAllPackRows(String packId) {
        List<ContentPack> rows = packRepository.findAllByPackId(packId);
        if (!rows.isEmpty()) {
            packRepository.deleteAll(rows);
        }
    }

    /** Import QC-accepted AI practice variants from extractor metadata/AI_*.json. */
    private int importAiVariants(String sourceFolder, String packId, JsonNode manifest) throws IOException {
        Optional<Path> outputRootOptional = resolveOutputRootOptional();
        if (outputRootOptional.isPresent()) {
            Path metadataDir = localYearPath(outputRootOptional.get(), sourceFolder).resolve("metadata");
            if (Files.isDirectory(metadataDir)) {
                return importAiVariantsFromLocalMetadata(metadataDir, packId, sourceFolder);
            }
        }
        return importAiVariantsFromRemoteMetadata(sourceFolder, packId, manifest);
    }

    private int importAiVariantsFromLocalMetadata(Path metadataDir, String packId, String sourceFolder) throws IOException {
        int imported = 0;
        try (Stream<Path> files = Files.list(metadataDir)) {
            for (Path file : files.filter(p -> p.getFileName().toString().startsWith("AI_")).sorted().toList()) {
                imported += importAiVariantNode(objectMapper.readTree(file.toFile()), packId, sourceFolder);
            }
        }
        purgeDuplicateVariantsInPack(packId);
        return imported;
    }

    private int importAiVariantsFromRemoteMetadata(String sourceFolder, String packId, JsonNode manifest) {
        List<String> metadataFiles = loadRemoteMetadataFileNames(sourceFolder, manifest);
        if (metadataFiles.isEmpty()) {
            return 0;
        }
        int imported = 0;
        for (String fileName : metadataFiles) {
            if (!fileName.startsWith("AI_") || !fileName.endsWith(".json")) {
                continue;
            }
            for (String url : remoteMetadataFileUrls(sourceFolder, manifest, fileName)) {
                try {
                    String body = restTemplate.getForObject(url, String.class);
                    if (body == null || body.isBlank()) {
                        continue;
                    }
                    imported += importAiVariantNode(objectMapper.readTree(body), packId, sourceFolder);
                    break;
                } catch (Exception ignored) {
                    // Try the next supported remote metadata URL.
                }
            }
        }
        purgeDuplicateVariantsInPack(packId);
        return imported;
    }

    private int importAiVariantNode(JsonNode node, String packId, String sourceFolder) {
        if (!"accepted".equalsIgnoreCase(text(node, "qc_status"))) {
            return 0;
        }
        String parentId = text(node, "parent_question_id");
        if (parentId.isBlank() || questionRepository.findByQuestionId(parentId).isEmpty()) {
            return 0;
        }
        Question doc = mapAiVariant(node, packId, parentId, sourceFolder);
        saveAiVariantUpsert(doc);
        return 1;
    }

    private List<String> loadRemoteMetadataFileNames(String sourceFolder, JsonNode manifest) {
        for (String indexUrl : remoteMetadataIndexUrls(sourceFolder, manifest)) {
            try {
                String body = restTemplate.getForObject(indexUrl, String.class);
                if (body == null || body.isBlank()) {
                    continue;
                }
                List<String> files = readMetadataFileNames(objectMapper.readTree(body));
                if (!files.isEmpty()) {
                    return files;
                }
            } catch (Exception ignored) {
                // Try the next supported metadata index URL.
            }
        }
        return List.of();
    }

    private List<String> readMetadataFileNames(JsonNode index) {
        JsonNode files = index.path("files");
        if (!files.isArray()) {
            files = index.path("metadata_files");
        }
        if (!files.isArray()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (JsonNode file : files) {
            String name = file.asText("").strip();
            if (name.startsWith("metadata/")) {
                name = name.substring("metadata/".length());
            }
            if (name.startsWith("AI_") && name.endsWith(".json")) {
                out.add(name);
            }
        }
        return out;
    }

    private List<String> remoteMetadataIndexUrls(String sourceFolder, JsonNode manifest) {
        List<String> urls = new ArrayList<>();
        remoteExtractorBaseUrl().ifPresent(base -> {
            urls.add(remoteYearUrl(base, sourceFolder) + "/metadata/index.json");
            urls.add(remoteYearUrl(base, sourceFolder) + "/metadata");
        });
        remotePublicFilesBaseUrl().ifPresent(base -> urls.add(remoteYearUrl(base, sourceFolder) + "/metadata/index.json"));
        inferPublicFolderBaseUrl(manifest).ifPresent(base -> urls.add(base + "/metadata/index.json"));
        return urls;
    }

    private List<String> remoteMetadataFileUrls(String sourceFolder, JsonNode manifest, String fileName) {
        List<String> urls = new ArrayList<>();
        remoteExtractorBaseUrl().ifPresent(base -> {
            urls.add(remoteYearUrl(base, sourceFolder) + "/metadata/" + fileName);
            urls.add(remoteYearUrl(base, sourceFolder) + "/metadata/" + fileName.replaceFirst("\\.json$", ""));
        });
        remotePublicFilesBaseUrl().ifPresent(base -> urls.add(remoteYearUrl(base, sourceFolder) + "/metadata/" + fileName));
        inferPublicFolderBaseUrl(manifest).ifPresent(base -> urls.add(base + "/metadata/" + fileName));
        return urls;
    }

    private Optional<String> remoteExtractorBaseUrl() {
        String baseUrl = appProperties.extractorManifestBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(baseUrl.replaceAll("/$", ""));
    }

    private Optional<String> remotePublicFilesBaseUrl() {
        String baseUrl = appProperties.publicFilesBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(baseUrl.replaceAll("/$", ""));
    }

    private Optional<String> inferPublicFolderBaseUrl(JsonNode manifest) {
        for (JsonNode q : manifest.path("questions")) {
            String url = text(q, "question_image_url");
            if (url.isBlank()) {
                url = text(q, "solution_image_url");
            }
            int marker = url.indexOf("/questions/");
            if (marker < 0) {
                marker = url.indexOf("/solutions/");
            }
            if (marker > 0) {
                return Optional.of(url.substring(0, marker));
            }
        }
        return Optional.empty();
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
        doc.setAnswerOnly(q.path("answer_only").asBoolean(false));
        doc.setQuestionImageUrl(text(q, "question_image_url"));
        String solutionUrl = text(q, "solution_image_url");
        if (solutionUrl.isBlank()) {
            solutionUrl = text(q, "solution_image");
        }
        doc.setSolutionImageUrl(solutionUrl);
        boolean hasSolutionFlag = q.path("has_solution").asBoolean(false);
        String solutionText = text(q, "solution_text_preview");
        if (solutionText.isBlank()) {
            solutionText = buildSolutionTextPreview(q);
        }
        doc.setHasSolution(hasSolutionFlag || !solutionUrl.isBlank() || !solutionText.isBlank());
        doc.setQuestionTextPreview(text(q, "question_text_preview"));
        doc.setSolutionTextPreview(solutionText);
        doc.setHints(readHintsList(q.path("hints")));
        doc.setOptions(readMcqOptions(q.path("options")));
        doc.setFormulaCards(readFormulaCards(q.path("formula_cards")));
        doc.setConceptExplanation(sanitize(text(q, "concept_explanation")));
        doc.setCommonMistakes(readStringList(q.path("common_mistakes")));
        doc.setPracticePattern(text(q, "practice_pattern"));
        doc.setSourceType("pyq");
        doc.setVariantNo(0);
        return doc;
    }

    /** Remove duplicate V1–V5 rows left from older imports (same parent + variant slot). */
    private void purgeDuplicateVariantsInPack(String packId) {
        List<Question> all =
                questionRepository
                        .findByPackId(packId, org.springframework.data.domain.PageRequest.of(0, 10000))
                        .getContent()
                        .stream()
                        .filter(q -> "ai_variant".equalsIgnoreCase(q.getSourceType()))
                        .filter(q -> q.getVariantNo() > 0)
                        .toList();
        Map<String, Question> keepers = new LinkedHashMap<>();
        for (Question q : all) {
            String key = q.getParentQuestionId() + "#" + q.getVariantNo();
            keepers.merge(key, q, AiVariantCatalog::preferCanonical);
        }
        for (Question q : all) {
            String key = q.getParentQuestionId() + "#" + q.getVariantNo();
            Question keeper = keepers.get(key);
            if (keeper != null && !keeper.getQuestionId().equals(q.getQuestionId())) {
                questionRepository.delete(q);
            }
        }
    }

    private void restoreAdminPreservedFields(List<Question> adminPreserve) {
        for (Question preserved : adminPreserve) {
            questionRepository
                    .findByQuestionId(preserved.getQuestionId())
                    .ifPresent(imported -> {
                        AdminQuestionPreserve.restorePreserved(preserved, imported);
                        questionRepository.save(imported);
                    });
        }
    }

    /** Upsert by questionId and drop stale duplicates for the same parent + variant slot. */
    private void saveAiVariantUpsert(Question doc) {
        questionRepository
                .findByQuestionId(doc.getQuestionId())
                .ifPresent(existing -> {
                    doc.setId(existing.getId());
                    AdminQuestionPreserve.applyLockedFromSource(existing, doc);
                });
        questionRepository.save(doc);
        List<Question> siblings =
                questionRepository.findByParentQuestionIdAndPackIdAndVariantNo(
                        doc.getParentQuestionId(), doc.getPackId(), doc.getVariantNo());
        if (siblings.size() <= 1) {
            return;
        }
        Question keeper = siblings.stream().reduce(AiVariantCatalog::preferCanonical).orElse(doc);
        for (Question sibling : siblings) {
            if (!sibling.getQuestionId().equals(keeper.getQuestionId())) {
                questionRepository.delete(sibling);
            }
        }
    }

    private Question mapAiVariant(JsonNode v, String packId, String parentQuestionId, String sourceFolder) {
        Question parent = questionRepository.findByQuestionId(parentQuestionId).orElseThrow();
        Question doc = new Question();
        doc.setQuestionId(text(v, "question_id"));
        doc.setPackId(packId);
        doc.setQuestionNo(parent.getQuestionNo());
        doc.setExam(text(v, "exam").isBlank() ? parent.getExam() : text(v, "exam"));
        doc.setYear(v.path("year").asInt(parent.getYear()));
        doc.setAnswer(text(v, "answer"));
        doc.setSubject(text(v, "subject").isBlank() ? parent.getSubject() : text(v, "subject"));
        doc.setChapter(text(v, "chapter").isBlank() ? parent.getChapter() : text(v, "chapter"));
        doc.setTopic(text(v, "topic").isBlank() ? parent.getTopic() : text(v, "topic"));
        doc.setSubtopic(text(v, "subtopic").isBlank() ? parent.getSubtopic() : text(v, "subtopic"));
        doc.setDifficulty(v.path("difficulty").asInt(parent.getDifficulty()));
        List<String> concepts = new ArrayList<>();
        v.path("concepts").forEach(c -> concepts.add(c.asText()));
        if (concepts.isEmpty() && parent.getConcepts() != null) {
            concepts.addAll(parent.getConcepts());
        }
        doc.setConcepts(concepts);
        doc.setHasDiagram(v.path("has_diagram").asBoolean(false));
        doc.setHasEquation(v.path("has_equation").asBoolean(false));
        doc.setAnswerOnly(v.path("answer_only").asBoolean(false));
        String imageUrl = text(v, "question_image_url");
        if (imageUrl.isBlank()) {
            imageUrl = text(v, "question_image");
        }
        doc.setQuestionImageUrl(imageUrl);
        String solutionUrl = text(v, "solution_image_url");
        if (solutionUrl.isBlank()) {
            solutionUrl = text(v, "solution_image");
        }
        doc.setSolutionImageUrl(solutionUrl);
        String preview = text(v, "question_text_preview");
        if (preview.isBlank()) {
            preview = text(v, "question_text");
        }
        doc.setQuestionTextPreview(sanitize(preview));
        String solutionText = buildSolutionTextPreview(v);
        doc.setSolutionTextPreview(solutionText);
        boolean hasSolutionFlag = v.path("has_solution").asBoolean(false);
        doc.setHasSolution(hasSolutionFlag && (!solutionUrl.isBlank() || !solutionText.isBlank()));
        List<String> hints = new ArrayList<>(readHintsList(v.path("hints")));
        String rationale = text(v, "answer_rationale");
        if (!rationale.isBlank()) {
            hints.add(sanitize(rationale));
        }
        doc.setHints(hints);
        doc.setOptions(readMcqOptions(v.path("options")));
        doc.setFormulaCards(readFormulaCards(v.path("formula_cards")));
        doc.setConceptExplanation(sanitize(text(v, "concept_explanation")));
        doc.setCommonMistakes(readStringList(v.path("common_mistakes")));
        doc.setPracticePattern(text(v, "practice_pattern"));
        doc.setSourceType("ai_variant");
        doc.setParentQuestionId(parentQuestionId);
        doc.setVariantNo(v.path("variant_no").asInt(0));
        doc.setVariantType(text(v, "variant_type"));
        applyVariantFormatFields(doc, v);
        attachDiagramSvgs(doc, sourceFolder);
        return doc;
    }

    private void applyVariantFormatFields(Question doc, JsonNode v) {
        String format = text(v, "question_format");
        if (format.isBlank()) {
            format = text(v, "variant_type");
        }
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.QUESTION_FORMAT)) {
            doc.setQuestionFormat(format);
        }
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.ASSERTION)) {
            doc.setAssertion(sanitize(text(v, "assertion")));
        }
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.REASON)) {
            doc.setReason(sanitize(text(v, "reason")));
        }
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.STATEMENTS)) {
            doc.setStatements(readMcqOptions(v.path("statements")));
        }
        String diagramUrl = text(v, "question_diagram_url");
        if (diagramUrl.isBlank()) {
            diagramUrl = text(v, "question_image_url");
        }
        if ((doc.getQuestionImageUrl() == null || doc.getQuestionImageUrl().isBlank()) && !diagramUrl.isBlank()) {
            doc.setQuestionImageUrl(diagramUrl);
        }
        if (v.path("has_diagram").asBoolean(false)) {
            doc.setHasDiagram(true);
        }
    }

    private void attachDiagramSvgs(Question doc, String sourceFolder) {
        if (sourceFolder == null || sourceFolder.isBlank()) {
            return;
        }
        String qid = doc.getQuestionId();
        if (qid == null || qid.isBlank()) {
            return;
        }
        Optional<Path> outputRootOptional = resolveOutputRootOptional();
        if (outputRootOptional.isEmpty()) {
            return;
        }
        Path diagramsDir = localYearPath(outputRootOptional.get(), sourceFolder).resolve("diagrams");
        Path questionSvg = diagramsDir.resolve(qid + "_question.svg");
        Path solutionSvg = diagramsDir.resolve(qid + "_solution.svg");
        try {
            if (Files.isRegularFile(questionSvg)
                    && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.QUESTION_DIAGRAM_SVG)) {
                doc.setQuestionDiagramSvg(Files.readString(questionSvg));
            }
            if (Files.isRegularFile(solutionSvg)
                    && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.SOLUTION_DIAGRAM_SVG)) {
                doc.setSolutionDiagramSvg(Files.readString(solutionSvg));
            }
        } catch (IOException ignored) {
            /* optional local diagrams */
        }
    }

    private static String sanitize(String value) {
        return AiTextNormalizer.sanitizeEnrichmentText(value);
    }

    private static List<String> readStringList(JsonNode arr) {
        if (arr == null || !arr.isArray()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        arr.forEach(node -> {
            String value = node.asText("").strip();
            if (!value.isBlank()) {
                out.add(sanitize(value));
            }
        });
        return out;
    }

    private static List<String> readHintsList(JsonNode arr) {
        if (arr == null || !arr.isArray()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (JsonNode node : arr) {
            String value = "";
            if (node.isTextual()) {
                value = node.asText("");
            } else if (node.isObject()) {
                value = text(node, "content");
                if (value.isBlank()) {
                    value = text(node, "hint");
                }
                if (value.isBlank()) {
                    value = text(node, "text");
                }
            }
            value = value.strip();
            if (!value.isBlank()) {
                out.add(sanitize(value));
            }
        }
        return out;
    }

    private static List<McqOption> readMcqOptions(JsonNode arr) {
        if (arr == null || !arr.isArray()) {
            return List.of();
        }
        List<McqOption> out = new ArrayList<>();
        for (JsonNode node : arr) {
            String id = text(node, "id");
            if (id.isBlank()) {
                id = text(node, "label");
            }
            String optionText = text(node, "text");
            if (optionText.isBlank()) {
                optionText = text(node, "option");
            }
            if (id.isBlank() || optionText.isBlank()) {
                continue;
            }
            McqOption option = new McqOption();
            option.setId(id.strip());
            option.setText(sanitize(optionText));
            out.add(option);
        }
        return out;
    }

    private static String buildSolutionTextPreview(JsonNode node) {
        String preview = text(node, "solution_text_preview");
        if (!preview.isBlank()) {
            return sanitize(preview);
        }
        JsonNode steps = node.path("solution_steps");
        if (steps == null || !steps.isArray() || steps.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode step : steps) {
            String title = text(step, "title");
            String content = text(step, "content");
            if (content.isBlank()) {
                continue;
            }
            if (!title.isBlank()) {
                sb.append("**").append(title).append("**\n\n");
            }
            sb.append(content).append("\n\n");
        }
        return sanitize(sb.toString().strip());
    }

    private static List<FormulaCard> readFormulaCards(JsonNode arr) {
        if (arr == null || !arr.isArray()) {
            return List.of();
        }
        List<FormulaCard> out = new ArrayList<>();
        for (JsonNode node : arr) {
            String name = text(node, "name");
            String formula = text(node, "formula");
            if (formula.isBlank()) {
                formula = text(node, "equation");
            }
            String description = text(node, "description");
            if (description.isBlank()) {
                description = text(node, "when_to_use");
            }
            if (description.isBlank()) {
                description = text(node, "whenToUse");
            }
            if (name.isBlank() && formula.isBlank()) {
                continue;
            }
            formula = AiTextNormalizer.normalizeFormulaLatex(formula);
            description = AiTextNormalizer.sanitizeEnrichmentText(description);
            FormulaCard card = new FormulaCard();
            card.setName(name);
            card.setFormula(formula);
            card.setDescription(description);
            out.add(card);
        }
        return out;
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

    /**
     * Backfill MCQ options, hints, and text solutions for AI variants already in MongoDB
     * (e.g. imported before options support) by reading extractor metadata/AI_*.json.
     */
    public Question enrichVariantFromDisk(Question doc) {
        if (doc == null || !"ai_variant".equalsIgnoreCase(doc.getSourceType())) {
            return doc;
        }
        try {
            String folder = resolveSourceFolder(doc.getPackId());
            return loadVariantMetadataNode(doc)
                    .map(node -> {
                        applyVariantEnrichment(doc, node);
                        applyVariantFormatFields(doc, node);
                        attachDiagramSvgs(doc, folder);
                        return questionRepository.save(doc);
                    })
                    .orElse(doc);
        } catch (IOException | IllegalStateException ex) {
            return doc;
        }
    }

    private java.util.Optional<JsonNode> loadVariantMetadataNode(Question doc) throws IOException {
        String folder = resolveSourceFolder(doc.getPackId());
        Path file =
                resolveOutputRoot()
                        .resolve(folder)
                        .resolve("metadata")
                        .resolve(doc.getQuestionId() + ".json");
        if (!Files.isRegularFile(file)) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(objectMapper.readTree(file.toFile()));
    }

    private String resolveSourceFolder(String packId) {
        return packRepository
                .findByPackId(packId)
                .map(p -> p.getSourceFolder())
                .filter(f -> f != null && !f.isBlank())
                .orElse(packId != null ? packId.replace("NEET_", "") : "2016");
    }

    private void applyVariantEnrichment(Question doc, JsonNode v) {
        String preview = text(v, "question_text_preview");
        if (preview.isBlank()) {
            preview = text(v, "question_text");
        }
        if (!preview.isBlank()
                && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.QUESTION_TEXT)) {
            doc.setQuestionTextPreview(sanitize(preview));
        }
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.OPTIONS)) {
            doc.setOptions(readMcqOptions(v.path("options")));
        }
        String solutionText = buildSolutionTextPreview(v);
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.SOLUTION_TEXT)) {
            doc.setSolutionTextPreview(solutionText);
        }
        String solutionUrl = text(v, "solution_image_url");
        if (solutionUrl.isBlank()) {
            solutionUrl = text(v, "solution_image");
        }
        if (!solutionUrl.isBlank()) {
            doc.setSolutionImageUrl(solutionUrl);
        }
        boolean hasSolutionFlag = v.path("has_solution").asBoolean(false);
        doc.setHasSolution(
                hasSolutionFlag
                        && (!nullToEmpty(doc.getSolutionImageUrl()).isBlank() || !solutionText.isBlank()));
        List<String> hints = new ArrayList<>(readHintsList(v.path("hints")));
        String rationale = text(v, "answer_rationale");
        if (!rationale.isBlank()) {
            hints.add(sanitize(rationale));
        }
        if (!hints.isEmpty() && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.HINTS)) {
            doc.setHints(hints);
        }
        List<FormulaCard> formulas = readFormulaCards(v.path("formula_cards"));
        if (!formulas.isEmpty() && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.FORMULA_CARDS)) {
            doc.setFormulaCards(formulas);
        }
        String concept = text(v, "concept_explanation");
        if (!concept.isBlank()
                && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.CONCEPT_EXPLANATION)) {
            doc.setConceptExplanation(sanitize(concept));
        }
        List<String> mistakes = readStringList(v.path("common_mistakes"));
        if (!mistakes.isEmpty() && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.COMMON_MISTAKES)) {
            doc.setCommonMistakes(mistakes);
        }
        String pattern = text(v, "practice_pattern");
        if (!pattern.isBlank() && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.PRACTICE_PATTERN)) {
            doc.setPracticePattern(pattern);
        }
        applyVariantFormatFields(doc, v);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public record ImportResult(
            String packId,
            int questionsImported,
            int variantsImported,
            int packsProcessed,
            List<ImportResult> details
    ) {}

    public record ImportFolderEntry(
            String folderName,
            String packId,
            String exam,
            int year,
            int questionCount
    ) {}

    public record RemovePackResult(String packId, long questionsRemoved) {}
}

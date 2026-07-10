package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.QuestionRepository;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminQuestionContentFormatService {

    private final QuestionRepository questions;
    private final QuestionMetadataStore metadataStore;
    private final ManifestImportService manifestImportService;
    private final StructuredContentService structuredContentService;
    private final ExtractorPipelineRunner pipelineRunner;
    private final RawTextLatexFixService rawTextLatexFixService;
    private final AppProperties appProperties;

    public AdminQuestionContentFormatService(
            QuestionRepository questions,
            QuestionMetadataStore metadataStore,
            ManifestImportService manifestImportService,
            StructuredContentService structuredContentService,
            ExtractorPipelineRunner pipelineRunner,
            RawTextLatexFixService rawTextLatexFixService,
            AppProperties appProperties) {
        this.questions = questions;
        this.metadataStore = metadataStore;
        this.manifestImportService = manifestImportService;
        this.structuredContentService = structuredContentService;
        this.pipelineRunner = pipelineRunner;
        this.rawTextLatexFixService = rawTextLatexFixService;
        this.appProperties = appProperties;
    }

    public ContentFormatView get(String questionId) {
        Question q = require(questionId);
        JsonNode meta = loadMetadata(q);
        q = syncStudentViewIfNeeded(q, meta);
        Optional<QuestionMetadataStore.MetadataRef> ref = metadataStore.resolve(q);
        return buildView(q, meta, ref.map(QuestionMetadataStore.MetadataRef::writable).orElse(false), "");
    }

    public ContentFormatView saveRawText(String questionId, String target, String text) {
        Question q = require(questionId);
        QuestionMetadataStore.MetadataRef ref =
                metadataStore
                        .resolve(q)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Metadata is not writable — mount EXTRACTOR_ROOT locally"));
        String normalizedTarget = normalizeTarget(target);
        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Raw text is empty");
        }
        try {
            JsonNode meta =
                    pipelineRunner.saveRawTextAndRefresh(
                            ref.sourceFolder(), q.getQuestionId(), normalizedTarget, text);
            unlockContentFields(q);
            manifestImportService.enrichFromDisk(q);
            return buildView(q, meta, true, "Raw text saved and re-parsed.");
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Metadata refresh interrupted");
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Metadata refresh failed: " + ex.getMessage());
        }
    }

    public ContentFormatView fixRawTextLatex(String questionId, String target, String text) {
        Question q = require(questionId);
        QuestionMetadataStore.MetadataRef ref =
                metadataStore
                        .resolve(q)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Metadata is not writable — mount EXTRACTOR_ROOT locally"));
        String normalizedTarget = normalizeTarget(target);
        String source = text;
        if (source == null || source.isBlank()) {
            JsonNode existing = loadMetadata(q);
            source = metadataStore.readRawText(existing, normalizedTarget);
        }
        JsonNode metaBefore = loadMetadata(q);
        String fixed = rawTextLatexFixService.fixRawText(source, metaBefore, normalizedTarget);
        String questionOverride = "question".equals(normalizedTarget) ? fixed : null;
        String solutionOverride = "solution".equals(normalizedTarget) ? fixed : null;
        return buildView(
                q,
                metaBefore,
                true,
                "LaTeX repaired in preview only — click Save to write metadata.",
                questionOverride,
                solutionOverride);
    }

    private void unlockContentFields(Question q) {
        AdminQuestionPreserve.unlockContentFields(q);
        questions.save(q);
    }

    /** Push approved metadata stem/options and solution text into Mongo when stale. */
    private Question syncStudentViewIfNeeded(Question q, JsonNode meta) {
        try {
            boolean stemStale =
                    structuredContentService.structuredExportAllowed(meta)
                            && structuredContentService.needsPyqStemMetadataRefresh(q, meta)
                            && !AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.QUESTION_TEXT);
            boolean solutionStale = structuredContentService.needsSolutionMetadataRefresh(q, meta);
            if (stemStale || solutionStale) {
                return manifestImportService.enrichFromDisk(q);
            }
            if (!structuredContentService.structuredExportAllowed(meta)
                    && structuredContentService.alreadyStructured(q)) {
                return manifestImportService.enrichFromDisk(q);
            }
        } catch (Exception ignored) {
            // Best-effort; admin preview still works from metadata.
        }
        return q;
    }

    private JsonNode loadMetadata(Question q) {
        try {
            JsonNode meta = metadataStore.loadRemote(q);
            if (meta == null || meta.isMissingNode()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Extractor metadata not found for " + q.getQuestionId());
            }
            return meta;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Failed to load metadata: " + ex.getMessage());
        }
    }

    private ContentFormatView buildView(
            Question q, JsonNode meta, boolean metadataWritable, String message) {
        return buildView(q, meta, metadataWritable, message, null, null);
    }

    private ContentFormatView buildView(
            Question q,
            JsonNode meta,
            boolean metadataWritable,
            String message,
            String questionRawOverride,
            String solutionRawOverride) {
        String folder = metadataStore.resolveFolder(q);
        String questionRawField = metadataStore.questionRawField(meta);
        String solutionRawField = metadataStore.solutionRawField(meta);
        List<OptionRow> options = readOptions(meta.path("options"));
        boolean approved = structuredContentService.structuredExportAllowed(meta);
        String metadataStem = approvedStemFromMetadata(meta);
        String mongoStem = Optional.ofNullable(q.getQuestionTextPreview()).orElse("").strip();
        boolean studentViewLocked = AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.QUESTION_TEXT);
        boolean studentViewStale =
                approved
                        && !metadataStem.isBlank()
                        && !metadataStem.equals(mongoStem);
        String metadataSolutionRaw =
                solutionRawOverride != null
                        ? solutionRawOverride.strip()
                        : QuestionMetadataStore.resolveSolutionText(meta).strip();
        String metadataSolution =
                AiTextNormalizer.sanitizeSolutionText(metadataSolutionRaw);
        String mongoSolution = Optional.ofNullable(q.getSolutionTextPreview()).orElse("").strip();
        boolean solutionViewStale =
                !metadataSolutionRaw.isBlank()
                        && !metadataSolutionRaw.equals(mongoSolution)
                        && !metadataSolution.equals(mongoSolution);
        return new ContentFormatView(
                q.getQuestionId(),
                folder,
                metadataWritable,
                message,
                QuestionMetadataStore.text(meta, "render_mode"),
                meta.path("content_render_approved").asBoolean(false),
                QuestionMetadataStore.text(meta, "question_format"),
                QuestionMetadataStore.text(meta, "question_stem"),
                options,
                QuestionMetadataStore.text(meta, "answer"),
                meta.path("has_diagram").asBoolean(false),
                meta.path("has_equation").asBoolean(false),
                questionRawField,
                questionRawOverride != null
                        ? questionRawOverride
                        : metadataStore.readRawText(meta, "question"),
                solutionRawField,
                metadataSolutionRaw,
                solutionRawOverride != null
                        ? solutionRawOverride
                        : metadataStore.readRawText(meta, "solution"),
                assetUrl(folder, QuestionMetadataStore.text(meta, "question_image_url"), QuestionMetadataStore.text(meta, "question_image")),
                assetUrl(folder, QuestionMetadataStore.text(meta, "solution_image_url"), QuestionMetadataStore.text(meta, "solution_image")),
                diagramUrls(folder, meta),
                readAssetPlacements(folder, meta),
                readSolutionAssetPlacements(folder, meta),
                q.getQuestionTextPreview(),
                q.getSolutionTextPreview(),
                mapMongoOptions(q.getOptions()),
                studentViewStale,
                studentViewLocked,
                solutionViewStale,
                q.isContentTextNormalized());
    }

    private static String approvedStemFromMetadata(JsonNode meta) {
        String stem = QuestionMetadataStore.text(meta, "question_stem");
        if (stem.isBlank()) {
            stem = QuestionMetadataStore.text(meta, "question_text");
        }
        if (stem.isBlank()) {
            return "";
        }
        return AiTextNormalizer.sanitizeQuestionStemText(stem);
    }

    private static List<OptionRow> mapMongoOptions(List<McqOption> options) {
        if (options == null || options.isEmpty()) {
            return List.of();
        }
        List<OptionRow> out = new ArrayList<>();
        for (McqOption o : options) {
            out.add(new OptionRow(o.getId(), o.getText()));
        }
        return out;
    }

    private List<String> diagramUrls(String folder, JsonNode meta) {
        List<String> urls = new ArrayList<>();
        JsonNode diagrams = meta.path("mineru_diagrams");
        if (diagrams.isArray()) {
            diagrams.forEach(node -> {
                String path = node.asText("").strip();
                if (!path.isBlank()) {
                    urls.add(assetUrl(folder, "", path));
                }
            });
        }
        return urls;
    }

    private List<AssetPlacementRow> readAssetPlacements(String folder, JsonNode meta) {
        List<AssetPlacementRow> out = new ArrayList<>();
        JsonNode placements = meta.path("question_asset_placements");
        if (!placements.isArray()) {
            return out;
        }
        placements.forEach(node -> {
            String marker = QuestionMetadataStore.text(node, "marker");
            String path = QuestionMetadataStore.text(node, "path");
            if (path.isBlank()) {
                path = QuestionMetadataStore.text(node, "url");
            }
            int index = node.path("index").asInt(-1);
            out.add(
                    new AssetPlacementRow(
                            index,
                            marker,
                            path,
                            assetUrl(folder, "", path),
                            node.path("hidden").asBoolean(false)));
        });
        return out;
    }

    private List<AssetPlacementRow> readSolutionAssetPlacements(String folder, JsonNode meta) {
        List<AssetPlacementRow> out = new ArrayList<>();
        JsonNode placements = meta.path("solution_asset_placements");
        if (!placements.isArray()) {
            return out;
        }
        placements.forEach(node -> {
            String marker = QuestionMetadataStore.text(node, "marker");
            String path = QuestionMetadataStore.text(node, "path");
            if (path.isBlank()) {
                path = QuestionMetadataStore.text(node, "url");
            }
            int index = node.path("index").asInt(-1);
            out.add(
                    new AssetPlacementRow(
                            index,
                            marker,
                            path,
                            assetUrl(folder, "", path),
                            node.path("hidden").asBoolean(false)));
        });
        return out;
    }

    private String assetUrl(String folder, String absoluteOrStored, String relativePath) {
        String candidate = absoluteOrStored != null && !absoluteOrStored.isBlank() ? absoluteOrStored : relativePath;
        if (candidate == null || candidate.isBlank()) {
            return "";
        }
        String trimmed = candidate.strip();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        String base = Optional.ofNullable(appProperties.publicFilesBaseUrl()).orElse("").strip();
        if (base.isBlank()) {
            return trimmed;
        }
        base = base.replaceAll("/$", "");
        if (folder != null && !folder.isBlank() && trimmed.startsWith(folder + "/")) {
            return base + "/" + trimmed;
        }
        if (folder == null || folder.isBlank()) {
            return base + "/" + trimmed;
        }
        return base + "/" + folder + "/" + trimmed;
    }

    private static List<OptionRow> readOptions(JsonNode arr) {
        List<OptionRow> out = new ArrayList<>();
        if (arr == null || !arr.isArray()) {
            return out;
        }
        arr.forEach(node -> {
            String id = QuestionMetadataStore.text(node, "id");
            String text = QuestionMetadataStore.text(node, "text");
            if (text.isBlank()) {
                text = QuestionMetadataStore.text(node, "option");
            }
            if (!id.isBlank() && !text.isBlank()) {
                out.add(new OptionRow(id, text));
            }
        });
        return out;
    }

    private static String normalizeTarget(String target) {
        return "solution".equalsIgnoreCase(target) ? "solution" : "question";
    }

    private Question require(String questionId) {
        return questions
                .findByQuestionId(questionId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    public record OptionRow(String id, String text) {}

    public record AssetPlacementRow(int index, String marker, String path, String url, boolean hidden) {}

    public record ContentFormatView(
            String questionId,
            String folder,
            boolean metadataWritable,
            String message,
            String renderMode,
            boolean contentRenderApproved,
            String questionFormat,
            String questionStem,
            List<OptionRow> options,
            String answer,
            boolean hasDiagram,
            boolean hasEquation,
            String questionRawField,
            String questionTextMineru,
            String solutionRawField,
            String metadataSolutionText,
            String solutionRawText,
            String questionImageUrl,
            String solutionImageUrl,
            List<String> mineruDiagramUrls,
            List<AssetPlacementRow> questionAssetPlacements,
            List<AssetPlacementRow> solutionAssetPlacements,
            String mongoQuestionTextPreview,
            String mongoSolutionTextPreview,
            List<OptionRow> mongoOptions,
            boolean studentViewStale,
            boolean studentViewLocked,
            boolean solutionViewStale,
            boolean contentTextNormalized) {}

    public record RawTextRequest(String target, String text) {}
}

package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.AssetPlacement;
import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.QuestionRepository;
import java.io.IOException;
import java.nio.file.Path;
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
        requireLocalContentWorkspace();
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
            manifestImportService.forceRefreshContentFromDisk(q);
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

    public ContentFormatView addContentAsset(String questionId, ContentAssetRequest body) {
        Question q = require(questionId);
        QuestionMetadataStore.MetadataRef ref = requireWritable(q);
        String target = normalizeTarget(body == null ? null : body.target());
        List<Double> bbox = requireSourceBbox(body == null ? null : body.sourceBbox());
        boolean insertMarker = body == null || body.insertMarker() == null || body.insertMarker();
        try {
            JsonNode meta =
                    pipelineRunner.addContentAssetFromSource(
                            ref.sourceFolder(), q.getQuestionId(), target, bbox, insertMarker);
            unlockContentFields(q);
            manifestImportService.refreshPyqAssetsFromDisk(q);
            String message = bridgeMessage(meta, "Figure added from source crop.");
            return buildView(q, meta, true, message);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Asset crop interrupted");
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Asset crop failed: " + ex.getMessage());
        }
    }

    public ContentFormatView cropContentAsset(String questionId, ContentAssetRequest body) {
        Question q = require(questionId);
        QuestionMetadataStore.MetadataRef ref = requireWritable(q);
        String target = normalizeTarget(body == null ? null : body.target());
        List<Double> bbox = requireSourceBbox(body == null ? null : body.sourceBbox());
        Integer indexObj = body == null ? null : body.index();
        int index = indexObj == null ? -1 : indexObj;
        if (index < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset index is required");
        }
        try {
            JsonNode meta =
                    pipelineRunner.cropContentAssetFromSource(
                            ref.sourceFolder(), q.getQuestionId(), target, index, bbox);
            unlockContentFields(q);
            manifestImportService.refreshPyqAssetsFromDisk(q);
            String message =
                    bridgeMessage(
                            meta,
                            "Figure re-cropped from source.");
            JsonNode r2 = meta.path("_exam_hunt_r2");
            if (r2.path("ok").asBoolean(false)) {
                message = bridgeMessage(meta, message);
            }
            return buildView(q, meta, true, message);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Asset re-crop interrupted");
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Asset re-crop failed: " + ex.getMessage());
        }
    }

    private QuestionMetadataStore.MetadataRef requireWritable(Question q) {
        return metadataStore
                .resolve(q)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Metadata is not writable — mount EXTRACTOR_ROOT locally"));
    }

    private static List<Double> requireSourceBbox(List<Double> sourceBbox) {
        if (sourceBbox == null || sourceBbox.size() != 4) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "sourceBbox must be [x0, y0, x1, y1] in 0–1000 space");
        }
        double x0 = sourceBbox.get(0);
        double y0 = sourceBbox.get(1);
        double x1 = sourceBbox.get(2);
        double y1 = sourceBbox.get(3);
        if (!(0 <= x0 && x0 < x1 && x1 <= 1000 && 0 <= y0 && y0 < y1 && y1 <= 1000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid source crop box");
        }
        if (x1 - x0 < 8 || y1 - y0 < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Crop box is too small");
        }
        return List.of(x0, y0, x1, y1);
    }

    private static String bridgeMessage(JsonNode meta, String fallback) {
        String message = QuestionMetadataStore.text(meta, "_exam_hunt_message");
        return message.isBlank() ? fallback : message;
    }

    private void unlockContentFields(Question q) {
        AdminQuestionPreserve.unlockContentFields(q);
        questions.save(q);
    }

    /** Push metadata into Mongo when stale — localhost EXTRACTOR_ROOT only. */
    private Question syncStudentViewIfNeeded(Question q, JsonNode meta) {
        if (!manifestImportService.isLocalContentWorkspace()) {
            return q;
        }
        try {
            boolean stemStale =
                    structuredContentService.structuredExportAllowed(meta)
                            && structuredContentService.needsPyqStemMetadataRefresh(q, meta)
                            && !AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.QUESTION_TEXT);
            boolean solutionStale = structuredContentService.needsSolutionMetadataRefresh(q, meta);
            if (stemStale || solutionStale) {
                return manifestImportService.forceRefreshContentFromDisk(q);
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
        String metadataStem = approvedStemFromMetadata(meta);
        String mongoStem = Optional.ofNullable(q.getQuestionTextPreview()).orElse("").strip();
        String metaRenderMode = QuestionMetadataStore.text(meta, "render_mode").strip().toLowerCase();
        String mongoRenderMode = Optional.ofNullable(q.getRenderMode()).orElse("").strip().toLowerCase();
        boolean metaStructuredLayout =
                ("structured".equals(metaRenderMode) || "hybrid".equals(metaRenderMode))
                        && !metadataStem.isBlank();
        boolean mongoStructuredLayout =
                ("structured".equals(mongoRenderMode) || "hybrid".equals(mongoRenderMode))
                        && structuredContentService.alreadyStructured(q);
        boolean studentViewLocked = AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.QUESTION_TEXT);
        boolean optionsStale = optionsMismatch(options, q.getOptions());
        boolean statementsStale =
                optionsMismatch(readOptions(meta.path("statements")), q.getStatements());
        boolean assetsStale = assetPlacementsMissing(q, readAssetPlacements(folder, meta));
        // Flag stale even for unapproved drafts — otherwise admin sync never appears after an
        // image downgrade, and "How students see it" looks hybrid while Mongo stays image.
        boolean studentViewStale =
                metaStructuredLayout
                        && ((!metadataStem.equals(mongoStem))
                                || optionsStale
                                || statementsStale
                                || assetsStale
                                || !mongoStructuredLayout);
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
                readOptions(meta.path("statements")),
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
                mapMongoOptions(q.getStatements()),
                mapMongoOptions(q.getMatchListA()),
                mapMongoOptions(q.getMatchListB()),
                mapMongoAssetPlacements(q.getAssetPlacements()),
                mapMongoAssetPlacements(q.getSolutionAssetPlacements()),
                Optional.ofNullable(q.getRenderMode()).orElse(""),
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

    /** True when Mongo is missing the 1–4 choice rows that metadata already has (incl. empty figure options). */
    private static boolean optionsMismatch(List<OptionRow> metadataOptions, List<McqOption> mongoOptions) {
        if (metadataOptions == null || metadataOptions.size() < 4) {
            return false;
        }
        if (mongoOptions == null || mongoOptions.size() < 4) {
            return true;
        }
        for (int i = 0; i < 4; i++) {
            OptionRow expected = metadataOptions.get(i);
            McqOption current = mongoOptions.get(i);
            String expectedId = expected == null || expected.id() == null ? "" : expected.id().strip();
            String currentId = current == null || current.getId() == null ? "" : current.getId().strip();
            if (!expectedId.equals(currentId)) {
                return true;
            }
            String expectedRaw = expected == null || expected.text() == null ? "" : expected.text().strip();
            String expectedText =
                    expectedRaw.isBlank() ? "" : AiTextNormalizer.sanitizeMcqOptionText(expectedRaw);
            String currentText = current == null || current.getText() == null ? "" : current.getText().strip();
            if (!expectedText.equals(currentText)) {
                return true;
            }
        }
        return false;
    }

    /** True when metadata has figure placements but Mongo lost them (student falls back to composite PDF). */
    private static boolean assetPlacementsMissing(Question q, List<AssetPlacementRow> metadataPlacements) {
        if (metadataPlacements == null || metadataPlacements.isEmpty()) {
            return false;
        }
        String stem = Optional.ofNullable(q.getQuestionTextPreview()).orElse("");
        if (!stem.contains("{{asset:")) {
            return false;
        }
        return q.getAssetPlacements() == null || q.getAssetPlacements().isEmpty();
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

    private static List<AssetPlacementRow> mapMongoAssetPlacements(List<AssetPlacement> placements) {
        if (placements == null || placements.isEmpty()) {
            return List.of();
        }
        List<AssetPlacementRow> out = new ArrayList<>();
        for (AssetPlacement p : placements) {
            if (p == null) {
                continue;
            }
            out.add(
                    new AssetPlacementRow(
                            p.getIndex(),
                            p.getMarker(),
                            p.getPath(),
                            p.getUrl(),
                            false,
                            List.of()));
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
            List<Double> bbox = readBbox(node.path("bbox"));
            out.add(
                    new AssetPlacementRow(
                            index,
                            marker,
                            path,
                            assetUrl(folder, "", path),
                            node.path("hidden").asBoolean(false),
                            bbox));
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
            List<Double> bbox = readBbox(node.path("bbox"));
            out.add(
                    new AssetPlacementRow(
                            index,
                            marker,
                            path,
                            assetUrl(folder, "", path),
                            node.path("hidden").asBoolean(false),
                            bbox));
        });
        return out;
    }

    private static List<Double> readBbox(JsonNode bboxNode) {
        if (bboxNode == null || !bboxNode.isArray() || bboxNode.size() != 4) {
            return List.of();
        }
        List<Double> out = new ArrayList<>(4);
        for (JsonNode value : bboxNode) {
            out.add(value.asDouble());
        }
        return out;
    }

    private String assetUrl(String folder, String absoluteOrStored, String relativePath) {
        String candidate =
                absoluteOrStored != null && !absoluteOrStored.isBlank()
                        ? absoluteOrStored
                        : relativePath;
        String publicUrl = AssetUrlRewriter.rewrite(candidate, folder, appProperties.publicFilesBaseUrl());
        String localPreview = localAdminPreviewUrl(folder, candidate, relativePath);
        return localPreview.isBlank() ? publicUrl : localPreview;
    }

    /**
     * Prefer a local preview when the file exists under EXTRACTOR_ROOT — same {@code /api/local-files/}
     * URLs the student API uses, so admin and solve views show identical bytes after a crop.
     */
    private String localAdminPreviewUrl(String folder, String candidate, String relativePath) {
        if (folder == null || folder.isBlank()) {
            return "";
        }
        Path root;
        try {
            root = metadataStore.outputRootOrThrow();
        } catch (IllegalStateException ex) {
            return "";
        }
        String rel = firstNonBlank(relativePath, stripToRelative(candidate, folder));
        return LocalExtractorAssetUrls.apiUrlIfPresent(root, folder, rel.isBlank() ? candidate : rel);
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a.strip();
        }
        return b == null ? "" : b.strip();
    }

    private static String stripToRelative(String urlOrPath, String folder) {
        if (urlOrPath == null || urlOrPath.isBlank()) {
            return "";
        }
        String trimmed = urlOrPath.strip();
        if (AssetUrlRewriter.isLocalDevFilesUrl(trimmed)) {
            trimmed = trimmed.replaceFirst("(?i)^https?://(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?/files/", "");
        } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            int idx = trimmed.indexOf("/" + folder + "/");
            if (idx >= 0) {
                trimmed = trimmed.substring(idx + 1);
            } else {
                int last = trimmed.lastIndexOf('/');
                return last >= 0 ? trimmed.substring(last + 1) : trimmed;
            }
        }
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        return trimmed;
    }

    private static List<OptionRow> readOptions(JsonNode arr) {
        List<OptionRow> out = new ArrayList<>();
        if (arr == null || !arr.isArray()) {
            return out;
        }
        arr.forEach(node -> {
            String id = QuestionMetadataStore.text(node, "id");
            if (id.isBlank()) {
                id = QuestionMetadataStore.text(node, "label");
            }
            String text = QuestionMetadataStore.text(node, "text");
            if (text.isBlank()) {
                text = QuestionMetadataStore.text(node, "option");
            }
            // Keep blank-text options (figure-option PYQs: choices live in {{asset:N}}).
            if (!id.isBlank()) {
                out.add(new OptionRow(id, text));
            }
        });
        return out;
    }

    private static String normalizeTarget(String target) {
        return "solution".equalsIgnoreCase(target) ? "solution" : "question";
    }

    private void requireLocalContentWorkspace() {
        if (!manifestImportService.isLocalContentWorkspace()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Fix question runs on localhost with EXTRACTOR_ROOT only — production serves Mongo/R2 already synced");
        }
    }

    private Question require(String questionId) {
        return questions
                .findByQuestionId(questionId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    public record OptionRow(String id, String text) {}

    public record AssetPlacementRow(
            int index, String marker, String path, String url, boolean hidden, List<Double> bbox) {}

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
            List<OptionRow> statements,
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
            List<OptionRow> mongoStatements,
            List<OptionRow> mongoMatchListA,
            List<OptionRow> mongoMatchListB,
            List<AssetPlacementRow> mongoAssetPlacements,
            List<AssetPlacementRow> mongoSolutionAssetPlacements,
            String mongoRenderMode,
            boolean studentViewStale,
            boolean studentViewLocked,
            boolean solutionViewStale,
            boolean contentTextNormalized) {}

    public record RawTextRequest(String target, String text) {}

    public record ContentAssetRequest(
            String target, List<Double> sourceBbox, Integer index, Boolean insertMarker) {}
}

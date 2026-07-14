package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.AssetPlacement;
import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Maps pdf-qa-extractor structured content (text stem, options, inline diagrams) onto {@link Question}.
 * Falls back to image-only when render_mode is {@code image} or structured fields are incomplete.
 */
@Service
public class StructuredContentService {

    private final AppProperties appProperties;

    public StructuredContentService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    /**
     * @return true when structured/hybrid text layout was applied
     */
    public boolean applyStructuredContent(Question doc, JsonNode meta, String sourceFolder) {
        return applyStructuredContent(doc, meta, sourceFolder, false);
    }

    /**
     * @param forceAdminSync when true (admin "Update student view"), apply hybrid/structured text
     *     even if {@code content_render_approved} is false — do not silently downgrade to image.
     */
    public boolean applyStructuredContent(
            Question doc, JsonNode meta, String sourceFolder, boolean forceAdminSync) {
        if (meta == null || meta.isMissingNode()) {
            return false;
        }

        String renderMode = text(meta, "render_mode").strip().toLowerCase();
        if (!"structured".equals(renderMode) && !"hybrid".equals(renderMode)) {
            doc.setRenderMode(renderMode.isBlank() ? "image" : renderMode);
            return false;
        }

        if (!forceAdminSync && !structuredExportAllowed(meta)) {
            // Leave Mongo alone. Import callers set image when apply returns false.
            // Mutating renderMode here re-wiped hybrid after admin "Update student view".
            return false;
        }

        String stem = text(meta, "question_stem");
        if (stem.isBlank()) {
            stem = text(meta, "question_text");
        }
        List<McqOption> options = readMcqOptions(meta.path("options"));

        boolean hasInlineAssets = stem.contains("{{asset:");
        if (stem.isBlank() || (options.size() < 4 && !hasInlineAssets)) {
            doc.setRenderMode("image");
            return false;
        }

        doc.setRenderMode(renderMode);
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.QUESTION_TEXT)) {
            doc.setQuestionTextPreview(AiTextNormalizer.sanitizeQuestionStemText(stem));
        }

        String format = text(meta, "question_format");
        if (format.isBlank()) {
            format = "mcq";
        }
        if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.QUESTION_FORMAT)) {
            doc.setQuestionFormat(format);
        }

        if (options.size() >= 4 && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.OPTIONS)) {
            doc.setOptions(options);
        }

        List<McqOption> statements = readMcqOptions(meta.path("statements"));
        if (!statements.isEmpty() && !AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.STATEMENTS)) {
            doc.setStatements(statements);
        }

        if (MatchingVariantParser.isMatchingVariant(meta)) {
            MatchingVariantParser.ParsedMatching parsed = MatchingVariantParser.parse(meta);
            if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.MATCH_LIST_A)
                    && !parsed.listA().isEmpty()) {
                doc.setMatchListA(parsed.listA());
            }
            if (!AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.MATCH_LIST_B)
                    && !parsed.listB().isEmpty()) {
                doc.setMatchListB(parsed.listB());
            }
        }

        applyDiagramAssets(doc, meta, sourceFolder, renderMode);
        applySolutionAssets(doc, meta, sourceFolder);
        doc.setContentTextNormalized(true);
        return true;
    }

    public boolean alreadyStructured(Question doc) {
        if (doc == null) {
            return false;
        }
        String mode = Optional.ofNullable(doc.getRenderMode()).orElse("").toLowerCase();
        if (!"structured".equals(mode) && !"hybrid".equals(mode)) {
            return false;
        }
        String stem = Optional.ofNullable(doc.getQuestionTextPreview()).orElse("").trim();
        if (stem.isBlank()) {
            return false;
        }
        // Figure-option PYQs have {{asset:N}} plus empty-text options 1–4. Asset alone is not enough —
        // without options the student UI cannot present choices.
        String format = Optional.ofNullable(doc.getQuestionFormat()).orElse("mcq").toLowerCase();
        if (format.contains("matching") || format.contains("assertion") || format.contains("statement")) {
            return true;
        }
        return doc.getOptions() != null && doc.getOptions().size() >= 4;
    }

    /** Re-parse List-I/II when Mongo has OCR-flattened matching columns but metadata has a MinerU table. */
    public boolean needsMatchListsMetadataRefresh(Question doc, JsonNode meta) {
        if (doc == null || meta == null || meta.isMissingNode()) {
            return false;
        }
        if (!"matching".equalsIgnoreCase(text(meta, "question_format"))
                && !"matching".equalsIgnoreCase(
                        Optional.ofNullable(doc.getQuestionFormat()).orElse(""))) {
            return false;
        }
        if (AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.MATCH_LIST_A)
                && AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.MATCH_LIST_B)) {
            return false;
        }
        String stem = text(meta, "question_stem");
        if (stem.isBlank() || !stem.contains("|")) {
            stem = text(meta, "question_text_mineru");
        }
        if (stem.isBlank() || !stem.contains("|")) {
            return false;
        }
        return MatchingVariantParser.listsLookCorrupt(doc.getMatchListA(), doc.getMatchListB());
    }

    /** Re-apply metadata when structured stem or options in MongoDB no longer match extractor output. */
    public boolean needsPyqStemMetadataRefresh(Question doc, JsonNode meta) {
        if (doc == null || meta == null || meta.isMissingNode()) {
            return false;
        }
        if (!structuredExportAllowed(meta)) {
            return false;
        }
        if (AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.QUESTION_TEXT)
                && AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.OPTIONS)) {
            return false;
        }
        String mode = Optional.ofNullable(text(meta, "render_mode")).orElse("").strip().toLowerCase();
        if (!"structured".equals(mode) && !"hybrid".equals(mode)) {
            return false;
        }
        String stem = text(meta, "question_stem");
        if (stem.isBlank()) {
            stem = text(meta, "question_text");
        }
        if (stem.isBlank()) {
            return false;
        }
        String expectedStem = AiTextNormalizer.sanitizeQuestionStemText(stem);
        String currentStem = Optional.ofNullable(doc.getQuestionTextPreview()).orElse("").strip();
        if (!expectedStem.equals(currentStem)) {
            return true;
        }
        List<McqOption> expectedOptions = readMcqOptions(meta.path("options"));
        if (expectedOptions.size() < 4) {
            return false;
        }
        List<McqOption> currentOptions = doc.getOptions();
        if (currentOptions == null || currentOptions.size() < 4) {
            return true;
        }
        for (int i = 0; i < 4; i++) {
            McqOption expected = expectedOptions.get(i);
            McqOption current = currentOptions.get(i);
            if (!expected.getId().equals(current.getId())) {
                return true;
            }
            if (!expected.getText().equals(Optional.ofNullable(current.getText()).orElse("").strip())) {
                return true;
            }
        }
        return false;
    }

    /** Re-apply metadata when structured solution text in MongoDB no longer matches extractor output. */
    public boolean needsSolutionMetadataRefresh(Question doc, JsonNode meta) {
        if (doc == null || meta == null || meta.isMissingNode()) {
            return false;
        }
        if (AdminQuestionPreserve.isLocked(doc, AdminQuestionPreserve.SOLUTION_TEXT)) {
            return false;
        }
        String expected = QuestionMetadataStore.resolveSolutionText(meta).strip();
        if (expected.isBlank()) {
            return false;
        }
        String current = Optional.ofNullable(doc.getSolutionTextPreview()).orElse("").strip();
        if (looksLikeCorruptSolution(current)) {
            return true;
        }
        if (expected.equals(current)) {
            return false;
        }
        String expectedSanitized = AiTextNormalizer.sanitizeSolutionText(expected);
        String currentSanitized = AiTextNormalizer.sanitizeSolutionText(current);
        return !expectedSanitized.equals(currentSanitized);
    }

    private static boolean looksLikeCorruptSolution(String text) {
        return AiTextNormalizer.looksLikeCorruptSolution(text);
    }

    /** Backfill solution diagram URLs when solution text has {{asset:N}} but Mongo has no placements. */
    public boolean needsSolutionAssetRefresh(Question doc, JsonNode meta) {
        if (doc == null || meta == null || meta.isMissingNode()) {
            return false;
        }
        if (hasLocalDevAssetUrls(doc.getSolutionAssetPlacements())) {
            return true;
        }
        String solution = Optional.ofNullable(doc.getSolutionTextPreview()).orElse("").strip();
        if (solution.isBlank()) {
            solution = AiTextNormalizer.sanitizeSolutionText(QuestionMetadataStore.resolveSolutionText(meta));
        }
        if (!solution.contains("{{asset:")) {
            return false;
        }
        if (doc.getSolutionAssetPlacements() != null && !doc.getSolutionAssetPlacements().isEmpty()) {
            return false;
        }
        JsonNode placements = meta.path("solution_asset_placements");
        if (placements.isArray() && !placements.isEmpty()) {
            return true;
        }
        JsonNode diagrams = meta.path("solution_mineru_diagrams");
        return diagrams.isArray() && !diagrams.isEmpty();
    }

    /** True when Mongo still stores local-dev {@code /files/} URLs that browsers cannot load remotely. */
    public boolean needsPublicAssetUrlRefresh(Question doc) {
        if (doc == null) {
            return false;
        }
        if (AssetUrlRewriter.isLocalDevFilesUrl(doc.getQuestionImageUrl())
                || AssetUrlRewriter.isLocalDevFilesUrl(doc.getSolutionImageUrl())) {
            return true;
        }
        return hasLocalDevAssetUrls(doc.getAssetPlacements())
                || hasLocalDevAssetUrls(doc.getSolutionAssetPlacements());
    }

    private static boolean hasLocalDevAssetUrls(java.util.List<AssetPlacement> placements) {
        if (placements == null || placements.isEmpty()) {
            return false;
        }
        for (AssetPlacement p : placements) {
            if (p != null && AssetUrlRewriter.isLocalDevFilesUrl(p.getUrl())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Rewrite placement URLs to the public CDN with local mtime cache-bust when available.
     * Does not write {@code /api/local-files/} into Mongo (that would break production).
     */
    public boolean syncAssetUrlsPreferLocal(Question doc, String sourceFolder) {
        if (doc == null) {
            return false;
        }
        return rewritePlacementList(doc.getAssetPlacements(), sourceFolder)
                | rewritePlacementList(doc.getSolutionAssetPlacements(), sourceFolder);
    }

    /** True when stem references {{asset:N}} but Mongo has no placement rows. */
    public boolean needsInlineAssetPlacementRefresh(Question doc) {
        if (doc == null) {
            return false;
        }
        String stem = Optional.ofNullable(doc.getQuestionTextPreview()).orElse("");
        if (!stem.contains("{{asset:")) {
            return false;
        }
        return doc.getAssetPlacements() == null || doc.getAssetPlacements().isEmpty();
    }

    /**
     * Rewrite local-dev {@code /files/} URLs to {@code PUBLIC_FILES_BASE_URL} without fetching R2
     * metadata. Returns true when any field changed.
     */
    public boolean rewriteLocalDevAssetUrls(Question doc, String sourceFolder) {
        if (doc == null || !needsPublicAssetUrlRefresh(doc)) {
            return false;
        }
        boolean changed = false;
        String qImg = rewriteAssetUrl(nullToEmpty(doc.getQuestionImageUrl()), sourceFolder);
        if (!qImg.equals(nullToEmpty(doc.getQuestionImageUrl()))) {
            doc.setQuestionImageUrl(qImg);
            changed = true;
        }
        String sImg = rewriteAssetUrl(nullToEmpty(doc.getSolutionImageUrl()), sourceFolder);
        if (!sImg.equals(nullToEmpty(doc.getSolutionImageUrl()))) {
            doc.setSolutionImageUrl(sImg);
            changed = true;
        }
        if (rewritePlacementList(doc.getAssetPlacements(), sourceFolder)) {
            changed = true;
        }
        if (rewritePlacementList(doc.getSolutionAssetPlacements(), sourceFolder)) {
            changed = true;
        }
        return changed;
    }

    private boolean rewritePlacementList(List<AssetPlacement> placements, String sourceFolder) {
        if (placements == null || placements.isEmpty()) {
            return false;
        }
        boolean changed = false;
        for (AssetPlacement p : placements) {
            if (p == null) {
                continue;
            }
            String path = nullToEmpty(p.getPath());
            String url = nullToEmpty(p.getUrl());
            String next =
                    !path.isBlank()
                            ? rewriteAssetUrl(path, sourceFolder)
                            : rewriteAssetUrl(url, sourceFolder);
            if (!next.isBlank() && !next.equals(url)) {
                p.setUrl(next);
                changed = true;
            }
        }
        return changed;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    public void applySolutionAssets(Question doc, JsonNode meta, String sourceFolder) {
        List<AssetPlacement> placements = resolveSolutionAssetPlacements(meta, sourceFolder);
        if (!placements.isEmpty()) {
            doc.setSolutionAssetPlacements(placements);
        }
    }

    /** Skip disk/R2 metadata fetch when structured text layout is already stored. */
    public boolean needsPyqDiskEnrichment(Question doc) {
        if (doc == null) {
            return false;
        }
        return !alreadyStructured(doc);
    }

    /** Skip variant metadata fetch when text/options/format content is already stored. */
    public boolean needsVariantDiskEnrichment(Question doc) {
        if (doc == null) {
            return false;
        }
        if (hasVariantOptions(doc)) {
            return false;
        }
        if (hasVariantFormatContent(doc)) {
            return false;
        }
        return !isImageOnlyVariant(doc);
    }

    /**
     * Matches pdf-qa-extractor publish: structured text only when reviewer approved.
     * Manifest rows omit the flag but are only exported as structured when approved.
     */
    public boolean structuredExportAllowed(JsonNode meta) {
        return isStructuredExportApproved(meta);
    }

    /** Static helper for import paths that do not have a service instance. */
    public static boolean isStructuredExportApproved(JsonNode meta) {
        if (meta == null || meta.isMissingNode()) {
            return false;
        }
        String mode = text(meta, "render_mode").strip().toLowerCase();
        if (!"structured".equals(mode) && !"hybrid".equals(mode)) {
            return false;
        }
        if (!meta.has("content_render_approved")) {
            return true;
        }
        return meta.path("content_render_approved").asBoolean(false);
    }

    /**
     * Metadata has a dedicated hybrid/structured {@code question_stem} (vs OCR {@code question_text}).
     * Does not require {@code content_render_approved} — approval gates pack export / default import,
     * not whether the stem field exists. Requiring approval here made admin sync write clean stem
     * then immediately overwrite it with dirty OCR {@code question_text}.
     */
    public boolean hasStructuredStemMetadata(JsonNode meta) {
        if (meta == null || meta.isMissingNode()) {
            return false;
        }
        String mode = text(meta, "render_mode").strip().toLowerCase();
        if (!"structured".equals(mode) && !"hybrid".equals(mode)) {
            return false;
        }
        return !text(meta, "question_stem").isBlank();
    }

    private static boolean hasVariantOptions(Question doc) {
        return doc.getOptions() != null && doc.getOptions().size() >= 4;
    }

    private static boolean hasVariantFormatContent(Question doc) {
        if (!Optional.ofNullable(doc.getAssertion()).orElse("").isBlank()) {
            return true;
        }
        if (!Optional.ofNullable(doc.getReason()).orElse("").isBlank()) {
            return true;
        }
        if (doc.getStatements() != null && !doc.getStatements().isEmpty()) {
            return true;
        }
        if (doc.getMatchListA() != null && !doc.getMatchListA().isEmpty()) {
            return true;
        }
        if (!Optional.ofNullable(doc.getQuestionDiagramSvg()).orElse("").isBlank()) {
            return true;
        }
        String stem = Optional.ofNullable(doc.getQuestionTextPreview()).orElse("").trim();
        return !stem.isBlank() && doc.getOptions() != null && !doc.getOptions().isEmpty();
    }

    private static boolean isImageOnlyVariant(Question doc) {
        String stem = Optional.ofNullable(doc.getQuestionTextPreview()).orElse("").trim();
        boolean hasImage = !Optional.ofNullable(doc.getQuestionImageUrl()).orElse("").isBlank();
        boolean noOptions = doc.getOptions() == null || doc.getOptions().isEmpty();
        return hasImage && noOptions && stem.isBlank();
    }

    private void applyDiagramAssets(Question doc, JsonNode meta, String sourceFolder, String renderMode) {
        List<AssetPlacement> placements = resolveAssetPlacements(meta, sourceFolder);
        boolean stemAssets = stemHasInlineAssets(doc.getQuestionTextPreview());
        boolean textOptions = hasTextMcqOptions(doc);
        boolean metaHasDiagram = meta.path("has_diagram").asBoolean(false);

        // MinerU often stores option-formula crops as question_asset_placements even when
        // options are already text and there is no real figure (e.g. NEET_2025_Q24).
        if (("hybrid".equals(renderMode) || "structured".equals(renderMode))
                && textOptions
                && !stemAssets
                && !metaHasDiagram) {
            doc.setAssetPlacements(List.of());
            doc.setHasDiagram(false);
            doc.setQuestionImageUrl("");
            return;
        }

        if (!placements.isEmpty()) {
            doc.setAssetPlacements(placements);
        }

        String diagramUrl = text(meta, "question_diagram_url");
        if (diagramUrl.isBlank()) {
            diagramUrl = text(meta, "question_diagram");
        }
        if (!diagramUrl.isBlank()) {
            diagramUrl = rewriteAssetUrl(diagramUrl, sourceFolder);
        }
        if (diagramUrl.isBlank() && !placements.isEmpty()) {
            diagramUrl = placements.get(0).getUrl();
        }
        if (diagramUrl.isBlank()) {
            diagramUrl = resolveFirstDiagramUrl(meta, sourceFolder);
        }

        if ("hybrid".equals(renderMode) || "structured".equals(renderMode)) {
            if (!diagramUrl.isBlank()) {
                diagramUrl = preferDiagramOnlyUrl(diagramUrl);
            }
            if (!diagramUrl.isBlank() && !stemAssets) {
                doc.setQuestionImageUrl(diagramUrl);
                doc.setHasDiagram(true);
            } else if (!placements.isEmpty()) {
                doc.setHasDiagram(true);
                doc.setQuestionImageUrl("");
            }
            ensureInlineAssetMarkers(doc);
        }
    }

    /** True when MCQ choices are real text (not empty figure-option rows). */
    private static boolean hasTextMcqOptions(Question doc) {
        if (doc.getOptions() == null || doc.getOptions().isEmpty()) {
            return false;
        }
        int nonBlank = 0;
        for (McqOption option : doc.getOptions()) {
            if (option != null && option.getText() != null && !option.getText().isBlank()) {
                nonBlank++;
            }
        }
        return nonBlank >= 2;
    }

    /** Backfill {{asset:N}} when metadata placements exist but the stored stem omitted the marker. */
    private void ensureInlineAssetMarkers(Question doc) {
        if (doc.getAssetPlacements() == null || doc.getAssetPlacements().isEmpty()) {
            return;
        }
        String stem = Optional.ofNullable(doc.getQuestionTextPreview()).orElse("").trim();
        if (stem.contains("{{asset:")) {
            return;
        }
        // Text options already show choices — do not inject option-strip crops into the stem.
        if (hasTextMcqOptions(doc)) {
            return;
        }
        String marker = "{{asset:0}}";
        int paren = stem.indexOf("\n(take ");
        if (paren < 0) {
            paren = stem.indexOf("(take ");
        }
        String updated =
                paren > 0
                        ? stem.substring(0, paren).strip() + "\n" + marker + "\n" + stem.substring(paren).strip()
                        : stem + "\n" + marker;
        doc.setQuestionTextPreview(AiTextNormalizer.sanitizeQuestionStemText(updated));
    }

    private static String preferDiagramOnlyUrl(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String trimmed = url.strip();
        if (trimmed.contains("/questions/")) {
            return "";
        }
        return trimmed;
    }

    private static boolean stemHasInlineAssets(String stem) {
        return stem != null && stem.contains("{{asset:");
    }

    private List<AssetPlacement> resolveAssetPlacements(JsonNode meta, String sourceFolder) {
        JsonNode placementsNode = meta.path("asset_placements");
        if (!placementsNode.isArray() || placementsNode.isEmpty()) {
            placementsNode = meta.path("question_asset_placements");
        }
        return buildAssetPlacements(placementsNode, readDiagramPaths(meta), sourceFolder);
    }

    private List<AssetPlacement> resolveSolutionAssetPlacements(JsonNode meta, String sourceFolder) {
        JsonNode placementsNode = meta.path("solution_asset_placements");
        List<String> diagramPaths = new ArrayList<>();
        appendDiagramPaths(diagramPaths, meta.path("solution_mineru_diagrams"));
        return buildAssetPlacements(placementsNode, diagramPaths, sourceFolder);
    }

    private List<AssetPlacement> buildAssetPlacements(
            JsonNode placementsNode, List<String> diagramPaths, String sourceFolder) {
        List<AssetPlacement> out = new ArrayList<>();

        if (placementsNode.isArray() && !placementsNode.isEmpty()) {
            for (JsonNode placement : placementsNode) {
                if (!placement.isObject()) {
                    continue;
                }
                int index = placement.path("index").asInt(out.size());
                String path = text(placement, "path");
                if (path.isBlank() && index >= 0 && index < diagramPaths.size()) {
                    path = diagramPaths.get(index);
                }
                String url = text(placement, "url");
                // Path is authoritative after metadata patches (stale absolute url fields are common).
                // Relative url-only rows still need the public CDN base applied.
                if (!path.isBlank()) {
                    url = rewriteAssetUrl(path, sourceFolder);
                } else if (!url.isBlank()) {
                    url = rewriteAssetUrl(url, sourceFolder);
                }
                if (url.isBlank()) {
                    continue;
                }
                AssetPlacement row = new AssetPlacement();
                row.setIndex(index);
                row.setMarker(text(placement, "marker"));
                if (row.getMarker().isBlank()) {
                    row.setMarker("asset:" + index);
                }
                row.setPath(path);
                row.setUrl(url);
                out.add(row);
            }
            return out;
        }

        for (int i = 0; i < diagramPaths.size(); i++) {
            String path = diagramPaths.get(i);
            String url = rewriteAssetUrl(path, sourceFolder);
            if (url.isBlank()) {
                continue;
            }
            AssetPlacement row = new AssetPlacement();
            row.setIndex(i);
            row.setMarker("asset:" + i);
            row.setPath(path);
            row.setUrl(url);
            out.add(row);
        }
        return out;
    }

    private List<String> readDiagramPaths(JsonNode meta) {
        List<String> paths = new ArrayList<>();
        appendDiagramPaths(paths, meta.path("mineru_diagrams"));
        if (paths.isEmpty()) {
            appendDiagramPaths(paths, meta.path("diagram_assets"));
        }
        String single = text(meta, "question_diagram");
        if (!single.isBlank()) {
            paths.add(single);
        }
        return paths;
    }

    private static void appendDiagramPaths(List<String> paths, JsonNode arr) {
        if (arr == null || !arr.isArray()) {
            return;
        }
        arr.forEach(node -> {
            String value = node.asText("").strip();
            if (!value.isBlank()) {
                paths.add(value);
            }
        });
    }

    private String resolveFirstDiagramUrl(JsonNode meta, String sourceFolder) {
        List<String> paths = readDiagramPaths(meta);
        if (paths.isEmpty()) {
            return "";
        }
        return rewriteAssetUrl(paths.get(0), sourceFolder);
    }

    private String rewriteAssetUrl(String url, String sourceFolder) {
        // Always persist public CDN URLs in Mongo so production (no EXTRACTOR_ROOT) works.
        String publicUrl =
                AssetUrlRewriter.rewrite(url, sourceFolder, appProperties.publicFilesBaseUrl());
        Optional<Path> outputRoot =
                LocalExtractorAssetUrls.resolveOutputRoot(appProperties.extractorRoot());
        if (outputRoot.isPresent() && !publicUrl.isBlank()) {
            return LocalExtractorAssetUrls.appendMtimeQuery(
                    publicUrl, outputRoot.get(), sourceFolder, url);
        }
        return publicUrl;
    }

    /**
     * Re-apply diagram / solution asset URLs from metadata without requiring a full stem refresh.
     * Used after crop-from-source so Mongo points at the new local file.
     */
    public void refreshDiagramAssets(Question doc, JsonNode meta, String sourceFolder) {
        if (doc == null || meta == null || meta.isMissingNode()) {
            return;
        }
        String renderMode = text(meta, "render_mode").strip().toLowerCase();
        if (renderMode.isBlank()) {
            renderMode = Optional.ofNullable(doc.getRenderMode()).orElse("image").strip().toLowerCase();
        }
        applyDiagramAssets(doc, meta, sourceFolder, renderMode);
        applySolutionAssets(doc, meta, sourceFolder);
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
            // Figure-option PYQs often have ids 1–4 with empty text (choices are in the diagram).
            if (id.isBlank()) {
                continue;
            }
            McqOption option = new McqOption();
            option.setId(id.strip());
            option.setText(
                    optionText.isBlank() ? "" : AiTextNormalizer.sanitizeMcqOptionText(optionText));
            out.add(option);
        }
        return out;
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).asText("");
    }
}

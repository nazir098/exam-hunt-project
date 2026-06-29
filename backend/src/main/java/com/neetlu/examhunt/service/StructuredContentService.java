package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.AssetPlacement;
import com.neetlu.examhunt.model.McqOption;
import com.neetlu.examhunt.model.Question;
import org.springframework.stereotype.Service;

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
        if (meta == null || meta.isMissingNode()) {
            return false;
        }

        String renderMode = text(meta, "render_mode").strip().toLowerCase();
        if (!"structured".equals(renderMode) && !"hybrid".equals(renderMode)) {
            doc.setRenderMode(renderMode.isBlank() ? "image" : renderMode);
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
        doc.setQuestionTextPreview(AiTextNormalizer.sanitizeEnrichmentText(stem));

        String format = text(meta, "question_format");
        if (format.isBlank()) {
            format = "mcq";
        }
        doc.setQuestionFormat(format);

        if (options.size() >= 4) {
            doc.setOptions(options);
        }

        List<McqOption> statements = readMcqOptions(meta.path("statements"));
        if (!statements.isEmpty()) {
            doc.setStatements(statements);
        }

        applyDiagramAssets(doc, meta, sourceFolder, renderMode);
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
        if (stem.contains("{{asset:")) {
            return true;
        }
        return doc.getOptions() != null && doc.getOptions().size() >= 4;
    }

    /** Skip disk/R2 metadata fetch when render mode was resolved at import or a prior enrich pass. */
    public boolean needsPyqDiskEnrichment(Question doc) {
        if (doc == null) {
            return false;
        }
        return Optional.ofNullable(doc.getRenderMode()).orElse("").isBlank();
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
        if (!placements.isEmpty()) {
            doc.setAssetPlacements(placements);
        }

        String diagramUrl = text(meta, "question_diagram_url");
        if (diagramUrl.isBlank() && !placements.isEmpty()) {
            diagramUrl = placements.get(0).getUrl();
        }
        if (diagramUrl.isBlank()) {
            diagramUrl = resolveFirstDiagramUrl(meta, sourceFolder);
        }

        if ("hybrid".equals(renderMode) || "structured".equals(renderMode)) {
            if (!diagramUrl.isBlank() && !stemHasInlineAssets(doc.getQuestionTextPreview())) {
                doc.setQuestionImageUrl(diagramUrl);
                doc.setHasDiagram(true);
            } else if (!placements.isEmpty()) {
                doc.setHasDiagram(true);
                doc.setQuestionImageUrl("");
            }
        }
    }

    private static boolean stemHasInlineAssets(String stem) {
        return stem != null && stem.contains("{{asset:");
    }

    private List<AssetPlacement> resolveAssetPlacements(JsonNode meta, String sourceFolder) {
        JsonNode placementsNode = meta.path("asset_placements");
        if (!placementsNode.isArray() || placementsNode.isEmpty()) {
            placementsNode = meta.path("question_asset_placements");
        }

        List<String> diagramPaths = readDiagramPaths(meta);
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
                if (url.isBlank() && !path.isBlank()) {
                    url = rewriteAssetUrl(path, sourceFolder);
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
        if (url == null || url.isBlank()) {
            return "";
        }
        String trimmed = url.strip();
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
        if (sourceFolder != null && !sourceFolder.isBlank() && trimmed.startsWith(sourceFolder + "/")) {
            return base + "/" + trimmed;
        }
        if (sourceFolder == null || sourceFolder.isBlank()) {
            return base + "/" + trimmed;
        }
        return base + "/" + sourceFolder + "/" + trimmed;
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
            option.setText(AiTextNormalizer.sanitizeEnrichmentText(optionText));
            out.add(option);
        }
        return out;
    }

    private static String text(JsonNode node, String field) {
        return node.path(field).asText("");
    }
}

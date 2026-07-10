package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.neetlu.examhunt.config.AppProperties;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.ContentPackRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/** Read/write pdf-qa-extractor metadata/{questionId}.json on local disk or R2 (read-only remote). */
@Service
public class QuestionMetadataStore {

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final ContentPackRepository packRepository;
    private final RestTemplate restTemplate;

    public QuestionMetadataStore(
            AppProperties appProperties,
            ObjectMapper objectMapper,
            ContentPackRepository packRepository) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.packRepository = packRepository;
        this.restTemplate = new RestTemplate();
    }

    public record MetadataRef(String sourceFolder, Path localFile, boolean writable) {}

    public Optional<MetadataRef> resolve(Question question) {
        if (question == null || question.getQuestionId() == null) {
            return Optional.empty();
        }
        String folder = resolveSourceFolder(question.getPackId());
        Optional<Path> outputRoot = resolveOutputRootOptional();
        if (outputRoot.isPresent()) {
            Path file =
                    outputRoot
                            .get()
                            .resolve(folder)
                            .resolve("metadata")
                            .resolve(question.getQuestionId() + ".json");
            if (Files.isRegularFile(file)) {
                return Optional.of(new MetadataRef(folder, file, true));
            }
        }
        return Optional.empty();
    }

    public JsonNode load(MetadataRef ref) throws IOException {
        if (ref != null && ref.localFile() != null && Files.isRegularFile(ref.localFile())) {
            return objectMapper.readTree(ref.localFile().toFile());
        }
        return null;
    }

    public JsonNode loadRemote(Question question) throws IOException {
        Optional<MetadataRef> local = resolve(question);
        if (local.isPresent()) {
            return load(local.get());
        }
        String folder = resolveSourceFolder(question.getPackId());
        String fileName = question.getQuestionId() + ".json";
        for (String url : remoteMetadataFileUrls(folder, fileName)) {
            try {
                String body = restTemplate.getForObject(url, String.class);
                if (body != null && !body.isBlank()) {
                    return objectMapper.readTree(body);
                }
            } catch (Exception ignored) {
                // try next URL
            }
        }
        return null;
    }

    public void writeLocal(MetadataRef ref, JsonNode meta) throws IOException {
        if (ref == null || !ref.writable() || ref.localFile() == null) {
            throw new IllegalStateException("Metadata is not writable on this server (mount EXTRACTOR_ROOT)");
        }
        Files.createDirectories(ref.localFile().getParent());
        if (meta instanceof ObjectNode objectNode) {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(ref.localFile().toFile(), objectNode);
        } else {
            Files.writeString(ref.localFile(), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(meta));
        }
    }

    public Path outputRootOrThrow() {
        return resolveOutputRootOptional()
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "EXTRACTOR_ROOT is not configured — mount local extractor output to edit metadata"));
    }

    private Optional<Path> resolveOutputRootOptional() {
        String root = appProperties.extractorRoot();
        if (root == null || root.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(Path.of(root).resolve("output"));
    }

    public String resolveFolder(Question question) {
        return resolve(question)
                .map(MetadataRef::sourceFolder)
                .orElseGet(() -> resolveSourceFolder(question.getPackId()));
    }

    private String resolveSourceFolder(String packId) {
        return packRepository
                .findByPackId(packId)
                .map(p -> p.getSourceFolder())
                .filter(f -> f != null && !f.isBlank())
                .orElse(packId != null ? packId.replace("NEET_", "") : "2016");
    }

    private List<String> remoteMetadataFileUrls(String sourceFolder, String fileName) {
        List<String> urls = new ArrayList<>();
        String manifestBase = appProperties.extractorManifestBaseUrl();
        if (manifestBase != null && !manifestBase.isBlank()) {
            urls.add(joinUrl(manifestBase, sourceFolder + "/metadata/" + fileName));
        }
        String publicBase = appProperties.publicFilesBaseUrl();
        if (publicBase != null && !publicBase.isBlank()) {
            urls.add(joinUrl(publicBase, sourceFolder + "/metadata/" + fileName));
        }
        return urls;
    }

    private static String joinUrl(String base, String path) {
        String trimmed = base.replaceAll("/$", "");
        String rel = path.startsWith("/") ? path.substring(1) : path;
        return trimmed + "/" + rel;
    }

    public static String text(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return "";
        }
        return node.path(field).asText("");
    }

    public String questionRawField(JsonNode meta) {
        String source = text(meta, "content_format_source").toLowerCase();
        String mineru = text(meta, "question_text_mineru");
        if ("mineru".equals(source)) {
            return "question_text_mineru";
        }
        if ("llm".equals(source) || "parser".equals(source)) {
            return mineru.isBlank() ? "question_text" : "question_text_mineru";
        }
        return mineru.isBlank() ? "question_text" : "question_text_mineru";
    }

    public String solutionRawField(JsonNode meta) {
        String source = text(meta, "solution_format_source").toLowerCase();
        return switch (source) {
            case "llm" -> "solution_text_llm";
            case "parser" -> "solution_text_parsed";
            case "mineru" -> "solution_text_mineru";
            default -> "solution_text";
        };
    }

    public String readRawText(JsonNode meta, String target) {
        String field = "solution".equals(target) ? solutionRawField(meta) : questionRawField(meta);
        return text(meta, field);
    }

    /** Best structured solution body from extractor metadata (matches pdf-qa-extractor publish). */
    public static String resolveSolutionText(JsonNode meta) {
        if (meta == null || meta.isMissingNode()) {
            return "";
        }
        String source = text(meta, "solution_format_source").toLowerCase();
        String fromSource =
                switch (source) {
                    case "llm" -> text(meta, "solution_text_llm");
                    case "parser" -> text(meta, "solution_text_parsed");
                    case "mineru" -> {
                        String mineru = text(meta, "solution_text_mineru");
                        yield mineru.isBlank() ? text(meta, "solution_text") : mineru;
                    }
                    default -> "";
                };
        if (!fromSource.isBlank()) {
            return fromSource;
        }
        for (String field :
                List.of(
                        "solution_text_mineru",
                        "solution_text_llm",
                        "solution_text_parsed",
                        "solution_text",
                        "solution_text_preview")) {
            String value = text(meta, field);
            if (!value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    public byte[] utf8Bytes(String text) {
        return text == null ? new byte[0] : text.getBytes(StandardCharsets.UTF_8);
    }
}

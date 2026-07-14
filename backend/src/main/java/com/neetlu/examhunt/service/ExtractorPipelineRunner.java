package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.config.AppProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Runs pdf-qa-extractor Python helpers against local metadata on disk. */
@Service
public class ExtractorPipelineRunner {

    private static final Logger log = LoggerFactory.getLogger(ExtractorPipelineRunner.class);

    private final AppProperties appProperties;
    private final QuestionMetadataStore metadataStore;
    private final ObjectMapper objectMapper;

    public ExtractorPipelineRunner(
            AppProperties appProperties, QuestionMetadataStore metadataStore, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.metadataStore = metadataStore;
        this.objectMapper = objectMapper;
    }

    public JsonNode saveRawTextAndRefresh(
            String folder, String questionId, String target, String rawText) throws IOException, InterruptedException {
        Path tempFile = Files.createTempFile("exam-hunt-raw-", ".txt");
        try {
            Files.writeString(tempFile, rawText == null ? "" : rawText, StandardCharsets.UTF_8);
            List<String> extra = List.of("--action", "raw-text", "--text-file", tempFile.toString());
            return runBridge(folder, questionId, target, extra);
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }

    public JsonNode addContentAssetFromSource(
            String folder,
            String questionId,
            String target,
            List<Double> sourceBboxNorm1000,
            boolean insertMarker)
            throws IOException, InterruptedException {
        String bboxJson = objectMapper.writeValueAsString(sourceBboxNorm1000);
        List<String> extra =
                List.of(
                        "--action",
                        "add-asset",
                        "--source-bbox-json",
                        bboxJson,
                        "--insert-marker",
                        insertMarker ? "true" : "false");
        return runBridge(folder, questionId, target, extra);
    }

    public JsonNode cropContentAssetFromSource(
            String folder, String questionId, String target, int index, List<Double> sourceBboxNorm1000)
            throws IOException, InterruptedException {
        String bboxJson = objectMapper.writeValueAsString(sourceBboxNorm1000);
        List<String> extra =
                List.of(
                        "--action",
                        "crop-asset",
                        "--index",
                        Integer.toString(index),
                        "--source-bbox-json",
                        bboxJson);
        return runBridge(folder, questionId, target, extra);
    }

    private JsonNode runBridge(String folder, String questionId, String target, List<String> extraArgs)
            throws IOException, InterruptedException {
        Path outputRoot = metadataStore.outputRootOrThrow();
        Path script = resolveScriptPath();
        if (!Files.isRegularFile(script)) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Extractor bridge script not found at " + script);
        }
        List<String> command = new ArrayList<>();
        command.add(resolvePythonBinary());
        command.add(script.toString());
        command.add("--output-root");
        command.add(outputRoot.toString());
        command.add("--folder");
        command.add(folder);
        command.add("--question-id");
        command.add(questionId);
        command.add("--target");
        command.add(target == null || target.isBlank() ? "question" : target);
        command.addAll(extraArgs);

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Map<String, String> env = pb.environment();
        String srcRoot = resolveExtractorSourceRoot();
        if (srcRoot != null && !srcRoot.isBlank()) {
            env.put("EXTRACTOR_SOURCE_ROOT", srcRoot.strip());
        }

        log.info("Extractor bridge: {}", String.join(" ", command));
        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        boolean finished = process.waitFor(5, TimeUnit.MINUTES);
        if (!finished) {
            process.destroyForcibly();
            throw new ResponseStatusException(
                    HttpStatus.GATEWAY_TIMEOUT, "Extractor metadata refresh timed out");
        }
        int code = process.exitValue();
        if (code != 0) {
            log.warn("Extractor bridge failed (exit {}): {}", code, output);
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "Extractor refresh failed: " + summarizeOutput(output));
        }
        return objectMapper.readTree(lastNonEmptyLine(output));
    }

    private static String summarizeOutput(String output) {
        if (output == null || output.isBlank()) {
            return "no output";
        }
        String trimmed = output.strip();
        return trimmed.length() > 400 ? trimmed.substring(0, 400) + "…" : trimmed;
    }

    private static String lastNonEmptyLine(String output) {
        String[] lines = output.split("\\R");
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].strip();
            if (!line.isBlank() && line.startsWith("{")) {
                return line;
            }
        }
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY, "Extractor bridge returned no JSON: " + summarizeOutput(output));
    }

    private Path resolveScriptPath() {
        Path bundled = Path.of("/app/scripts/extractor_metadata.py");
        if (Files.isRegularFile(bundled)) {
            return bundled.toAbsolutePath();
        }
        String cwd = System.getProperty("user.dir", ".");
        Path fromBackend = Path.of(cwd, "scripts", "extractor_metadata.py");
        if (Files.isRegularFile(fromBackend)) {
            return fromBackend.toAbsolutePath();
        }
        Path fromRoot = Path.of(cwd, "backend", "scripts", "extractor_metadata.py");
        if (Files.isRegularFile(fromRoot)) {
            return fromRoot.toAbsolutePath();
        }
        return bundled.toAbsolutePath();
    }

    private String resolveExtractorSourceRoot() {
        String configured = appProperties.extractorSourceRoot();
        if (configured != null && !configured.isBlank()) {
            return configured.strip();
        }
        String extractorRoot = appProperties.extractorRoot();
        if (extractorRoot == null || extractorRoot.isBlank()) {
            return "";
        }
        Path src = Path.of(extractorRoot.strip(), "src");
        return Files.isDirectory(src) ? src.toString() : "";
    }

    private String resolvePythonBinary() {
        String env = System.getenv("PYTHON");
        if (env != null && !env.isBlank()) {
            return env.strip();
        }
        String extractorRoot = appProperties.extractorRoot();
        if (extractorRoot != null && !extractorRoot.isBlank()) {
            for (String name : List.of("python3", "python")) {
                Path bin = Path.of(extractorRoot.strip(), ".venv", "bin", name);
                if (Files.isExecutable(bin)) {
                    return bin.toString();
                }
            }
        }
        return "python3";
    }
}

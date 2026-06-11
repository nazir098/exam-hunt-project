package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.service.llm.LlmCompletionOptions;
import com.neetlu.examhunt.service.llm.LlmJsonSchemas;
import com.neetlu.examhunt.service.llm.LlmResponseParser;
import com.neetlu.examhunt.model.FormulaCard;
import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class PracticeAiService {

    private static final String SYSTEM_NEET =
            """
            You are a NEET UG coach embedded in a practice app. Be concise (under 180 words unless asked for notes).
            Use clear bullets when helpful. Never invent facts not supported by the question context.
            Do not reveal the correct option letter/number when the student has not submitted yet and the mode is HINT.
            Never echo prompt labels such as "Mode:", task names, or metadata headers in your reply.
            """;

    private static final String SYSTEM_REVISION =
            """
            You are a NEET UG coach. Write compact revision notes for the student.
            Start immediately with ### Key facts — no preamble, no "Mode:" line, no repeated question metadata.
            Use markdown sections and inline LaTeX as $...$ only.
            """;

    private static final String SYSTEM_HINT_JSON =
            """
            You are a NEET UG coach. Return three progressive hints as JSON only:
            {"steps":["hint1","hint2","hint3"]}
            Never reveal the correct option number, letter, or final answer value.
            Each hint: 1–2 sentences; hints must become progressively more specific.
            No preamble, analysis, or markdown fences — JSON only.
            """;

    private static final String SYSTEM_HINT_PLAIN =
            """
            You are a NEET UG coach. Write exactly three progressive hints for the topic given.
            Use this format only — start immediately with Hint 1 (no "Let me analyze" or other preamble):
            Hint 1: ...
            Hint 2: ...
            Hint 3: ...
            Never reveal the correct option or final answer.
            Each hint: 1–2 sentences, progressively more specific.
            """;

    private static final String HINT_PLAIN_RETRY_SUFFIX =
            """

            Your previous reply was not usable. Reply again with ONLY these three lines:
            Hint 1: ...
            Hint 2: ...
            Hint 3: ...
            No analysis before Hint 1.
            """;

    private static final String SYSTEM_FORMULA =
            """
            You are a NEET UG formula assistant.

            Return ONLY valid JSON:
            {"formulas":[{"name":"string","equation":"LaTeX equation","whenToUse":"one short sentence"}]}

            No markdown. No reasoning. No analysis. No extra keys.
            At most 2 formulas. LaTeX only in equation — use \\\\mu_0, \\\\frac, subscripts; not Unicode symbols.
            Never reveal the MCQ option number or letter.
            """;

    private static final String SYSTEM_BASICS =
            """
            You are a NEET UG coach.

            HARD OUTPUT RULES (violations are invalid):
            - Line 1 must be exactly: ### Concept
            - No text, preamble, or reasoning before ### Concept
            - Maximum 150 words total — shorten if longer

            Exactly four sections in this order:
            ### Concept
            ### Key Formula(s)
            ### How to Approach This Question
            ### Common Mistake

            Prohibited:
            - Do not perform numerical calculations
            - Do not simplify expressions to a final result
            - Do not compare with MCQ options or eliminate options
            - Do not echo prompts, "Mode:", task lists, or "Class 11-12"
            - Do not use preambles like "Let me analyze" or "Based on the given question"

            Use inline LaTeX $...$ with \\\\mu_0, \\\\frac, subscripts.
            Key Formula(s): most directly usable formula; define each symbol once briefly.
            How to Approach This Question: 3–6 numbered steps (1. 2. 3. …).
            Do not reveal the final MCQ option number/letter unless the student already submitted.

            If diagram/preview is incomplete: teach the method only; do not guess distances, directions, or geometry; use "nearer side" / "farther side"; do not infer missing details from options.

            Invalid (preamble before heading):
            Let me analyze this question...
            ### Concept

            Invalid:
            Based on the given question...
            ### Concept

            Valid (starts immediately):
            ### Concept
            ...
            """;

    private static final String SYSTEM_PITFALLS =
            """
            You are a NEET UG exam coach.

            HARD OUTPUT RULES:
            - Line 1 must be exactly: ### Common mistakes
            - No preamble before the first heading
            - Maximum 120 words total

            Exactly two sections in this order:
            ### Common mistakes
            (3–4 bullet lines starting with -)

            ### Practice pattern
            One short paragraph: the recurring NEET trick or solution pattern for this topic type.

            Prohibited:
            - Do not reveal the correct MCQ option
            - Do not perform final calculations
            - Do not echo prompts or metadata headers
            """;

    private static final int BASICS_MAX_WORDS = 150;
    private static final int PITFALLS_MAX_WORDS = 120;

    private static final Pattern META_PREAMBLE =
            Pattern.compile(
                    "(?is)^\\s*(?:(?:let me (?:break down|analyze|explain)|based on the given question)[^.!?]*[.!?]\\s*)+");

    private final FreeLlmClient llm;
    private final PlatformSettingsService platformSettingsService;
    private final QuestionRepository questions;
    private final PracticeService practiceService;
    private final ObjectMapper objectMapper;

    public PracticeAiService(
            FreeLlmClient llm,
            PlatformSettingsService platformSettingsService,
            QuestionRepository questions,
            PracticeService practiceService,
            ObjectMapper objectMapper) {
        this.llm = llm;
        this.platformSettingsService = platformSettingsService;
        this.questions = questions;
        this.practiceService = practiceService;
        this.objectMapper = objectMapper;
    }

    public StatusView status() {
        var settings = platformSettingsService.requireSettings();
        return new StatusView(
                settings.isAiSuggestEnabled(),
                llm.isConfigured(),
                settings.isAiSuggestEnabled(),
                llm.isEnabled());
    }

    public AssistResponse assist(String userId, AssistRequest req) {
        requirePlatformEnabled();
        String feature = normalizeFeature(req.feature());
        return switch (feature) {
            case "why_wrong" -> whyWrong(req);
            case "hint" -> hint(req);
            case "formula" -> formula(req);
            case "explain_basics" -> explainBasics(req);
            case "pitfalls" -> pitfalls(req);
            case "weak_chapter_analysis" -> {
                requireLlmAvailable();
                yield weakChapterAnalysis(userId);
            }
            case "practice_from_weak" -> {
                requireLlmAvailable();
                yield practiceFromWeak(userId);
            }
            case "revision_notes" -> revisionNotes(req);
            case "mentor" -> {
                requireLlmAvailable();
                yield mentor(userId);
            }
            case "similar_questions" -> similarQuestions(req);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown feature: " + feature);
        };
    }

    private AssistResponse whyWrong(AssistRequest req) {
        Question q = requireQuestion(req.questionId());
        if (req.selectedAnswer() == null || req.selectedAnswer().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "selectedAnswer is required for why_wrong");
        }
        String cached = lookupWhyWrongExplanation(q, req.selectedAnswer());
        if (cached != null) {
            return new AssistResponse("why_wrong", cached, false, List.of(), null);
        }
        requireLlmAvailable();
        String prompt =
                """
                Mode: WHY WRONG
                The student already submitted and got this wrong.

                Question context:
                %s

                Correct answer key: %s
                Student chose: %s

                Explain the likely misconception and the correct reasoning path. Name the concept tested.
                Do not be harsh; be specific to this question.
                """
                        .formatted(questionBlock(q), q.getAnswer(), req.selectedAnswer());

        String text = AiTextNormalizer.normalize(llm.complete(SYSTEM_NEET, prompt, 0.35, 450));
        persistWhyWrongExplanation(q, req.selectedAnswer(), text);
        return new AssistResponse("why_wrong", text, true, List.of(), null);
    }

    private static boolean hasSubmittedAnswer(AssistRequest req) {
        return req.selectedAnswer() != null && !req.selectedAnswer().isBlank();
    }

    private AssistResponse hint(AssistRequest req) {
        Question q = requireQuestion(req.questionId());
        if (hasPrebakedHints(q)) {
            List<String> steps = sanitizeHintSteps(prebakedHintSteps(q));
            return new AssistResponse("hint", steps.get(0), false, List.of(), null, steps);
        }
        if (!llm.isEnabled()) {
            List<String> steps = sanitizeHintSteps(buildFallbackHints(q));
            return new AssistResponse("hint", steps.get(0), false, List.of(), null, steps);
        }
        List<String> steps = sanitizeHintSteps(fetchHintSteps(q));
        boolean fromLlm = hintsAreUsable(steps);
        if (!fromLlm) {
            steps = sanitizeHintSteps(buildFallbackHints(q));
        } else {
            persistHintEnrichment(q, steps);
        }
        String first = steps.get(0);
        return new AssistResponse("hint", first, fromLlm, List.of(), null, steps);
    }

    private static List<String> sanitizeHintSteps(List<String> steps) {
        return steps.stream().map(AiTextNormalizer::sanitizeEnrichmentText).toList();
    }

    private List<String> fetchHintSteps(Question q) {
        var caps = llm.capabilitiesForConfiguredModel();
        boolean structured = caps.supportsJsonMode() || caps.supportsJsonSchema();
        String system = structured ? SYSTEM_HINT_JSON : SYSTEM_HINT_PLAIN;
        String prompt = buildHintUserPrompt(q, structured);
        LlmCompletionOptions options = LlmCompletionOptions.text(0.1, 400);

        List<String> steps = requestAndExtractHints(system, prompt, options, structured);
        if (hintsAreUsable(steps)) {
            return steps;
        }

        String retryPrompt =
                prompt + (structured ? LlmJsonSchemas.JSON_RETRY_SUFFIX : HINT_PLAIN_RETRY_SUFFIX);
        steps = requestAndExtractHints(system, retryPrompt, options, structured);
        return steps;
    }

    private List<String> requestAndExtractHints(
            String system, String userPrompt, LlmCompletionOptions options, boolean structured) {
        String raw;
        if (structured) {
            FreeLlmClient.StructuredCompletion result =
                    llm.completeStructured(
                            system, userPrompt, options, "hint_steps", LlmJsonSchemas.HINT_STEPS);
            raw = result.rawText();
        } else {
            raw = llm.complete(system, userPrompt, options);
        }
        return LlmResponseParser.extractHintSteps(raw, objectMapper);
    }

    private static String buildHintUserPrompt(Question q, boolean jsonFormat) {
        String outputRules =
                jsonFormat
                        ? "Return ONLY valid JSON: {\"steps\":[\"...\",\"...\",\"...\"]}"
                        : """
                        Use exactly:
                        Hint 1: ...
                        Hint 2: ...
                        Hint 3: ...
                        """;
        return """
                Create 3 progressive hints for a NEET MCQ on this topic.
                The student has NOT submitted an answer.

                Topic metadata:
                %s

                %s

                Rules:
                - Hint 1: identify the core concept being tested.
                - Hint 2: key formula, law, or relation needed.
                - Hint 3: how to start solving without a final calculation or revealing any option.
                """
                .formatted(hintMetadataBlock(q), outputRules.strip());
    }

    /** Metadata-only context — avoids noisy OCR preview and MCQ option text. */
    private static String hintMetadataBlock(Question q) {
        StringBuilder sb = new StringBuilder();
        if (q.getSubject() != null && !q.getSubject().isBlank()) {
            sb.append("Subject: ").append(q.getSubject()).append("\n");
        }
        if (q.getChapter() != null && !q.getChapter().isBlank()) {
            sb.append("Chapter: ").append(q.getChapter()).append("\n");
        }
        if (q.getTopic() != null && !q.getTopic().isBlank()) {
            sb.append("Topic: ").append(q.getTopic()).append("\n");
        }
        if (q.getSubtopic() != null && !q.getSubtopic().isBlank()) {
            sb.append("Subtopic: ").append(q.getSubtopic()).append("\n");
        }
        if (sb.isEmpty()) {
            sb.append("Subject: (unknown)\n");
        }
        return sb.toString().strip();
    }

    private static boolean hintsAreUsable(List<String> steps) {
        if (steps.size() < 3) {
            return false;
        }
        List<String> three = steps.subList(0, 3);
        for (String s : three) {
            if (s.length() < 20 || !looksComplete(s)) {
                return false;
            }
        }
        return !three.get(0).equalsIgnoreCase(three.get(1))
                && !three.get(1).equalsIgnoreCase(three.get(2))
                && !three.get(0).equalsIgnoreCase(three.get(2));
    }

    /** Reject hints cut mid-sentence (common LLM truncation). */
    private static boolean looksComplete(String s) {
        String t = s.strip();
        if (t.endsWith(".") || t.endsWith("?") || t.endsWith("!") || t.endsWith(":")) {
            return true;
        }
        if (t.endsWith(")") || t.endsWith("]") || t.endsWith("\"")) {
            return true;
        }
        return t.length() >= 80;
    }

    private static List<String> buildFallbackHints(Question q) {
        String blob = (nullToEmpty(q.getChapter())
                        + " "
                        + nullToEmpty(q.getTopic())
                        + " "
                        + nullToEmpty(q.getQuestionTextPreview()))
                .toLowerCase(Locale.ROOT);

        if (isMagnetismQuestion(blob, q)) {
            return List.of(
                    "This tests magnetic force on current-carrying conductors — identify which segments of the loop feel force from the nearby straight wire.",
                    "Use the force law for parallel conductors: force depends on currents, length, and separation; nearer and farther sides feel unequal forces.",
                    "Compare force on the nearer side and farther side of the loop using the given distances from the figure — set up the net force symbolically without picking an option.");
        }
        if (blob.contains("rms")
                || blob.contains("r.m.s")
                || blob.contains("kinetic")
                || blob.contains("molecular speed")) {
            return List.of(
                    "This tests kinetic theory — link the quantity asked to molecular speed and absolute temperature for the same gas.",
                    "Recall how rms speed scales with temperature in Kelvin; convert °C before using any ratio.",
                    "Set up a speed ratio from the given initial speed and the two temperatures — simplify before matching options.");
        }
        if ("physics".equalsIgnoreCase(nullToEmpty(q.getSubject()))) {
            return List.of(
                    "Identify the chapter concept and the physical principle being tested from the metadata and question stem.",
                    "Write the key formula or law that connects the given quantities to what is asked.",
                    "Substitute or set up the relation using the givens — simplify before comparing with the four options.");
        }
        return List.of(
                "Identify the core concept from the chapter and topic metadata above.",
                "Recall the key formula, law, or reasoning step needed for this type of question.",
                "Start solving with the given information — set up the relation without computing the final answer or naming an option.");
    }

    private AssistResponse formula(AssistRequest req) {
        Question q = requireQuestion(req.questionId());
        if (!FormulaEligibility.questionNeedsFormula(q)) {
            return new AssistResponse(
                    "formula",
                    """
                    This question is **concept-based** — no key formula sheet is needed here.

                    Try **Basics** for the underlying idea, or **Hint** for a step-by-step nudge.
                    """
                            .strip(),
                    false,
                    List.of(),
                    null);
        }
        List<FormulaEntry> prebaked = prebakedFormulaEntries(q);
        if (formulasAreUsable(prebaked)) {
            return new AssistResponse("formula", formulaToMarkdown(prebaked), false, List.of(), null);
        }
        if (!llm.isEnabled()) {
            return new AssistResponse(
                    "formula",
                    """
                    No pre-imported formula cards for this question yet.

                    Try **Basics** or **Hint** — re-sync the pack from Admin if enrichment is missing.
                    """
                            .strip(),
                    false,
                    List.of(),
                    null);
        }
        String prompt =
                """
                %s

                List the 1–2 most important formulas needed for this PYQ.
                The student has NOT submitted the answer.
                """
                        .formatted(formulaSubjectBlock(q));

        List<FormulaEntry> entries = fetchFormulaEntriesFromLlm(prompt);
        boolean fromLlm = formulasAreUsable(entries);
        if (!fromLlm) {
            entries = buildFallbackFormulaEntries(q);
        } else {
            persistFormulaEnrichment(q, entries);
        }
        String markdown = formulaToMarkdown(entries);
        return new AssistResponse("formula", markdown, fromLlm, List.of(), null);
    }

    private List<FormulaEntry> fetchFormulaEntriesFromLlm(String prompt) {
        String json =
                llm.completeJson(
                        SYSTEM_FORMULA,
                        prompt,
                        LlmCompletionOptions.text(0.1, 280),
                        "formula_list",
                        LlmJsonSchemas.FORMULAS);
        List<FormulaEntry> entries = parseFormulaJson(json);
        return formulasAreUsable(entries) ? entries : List.of();
    }

    private static boolean formulasAreUsable(List<FormulaEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            return false;
        }
        for (FormulaEntry e : entries) {
            if (e.name().isBlank() || e.equation().isBlank() || e.whenToUse().isBlank()) {
                return false;
            }
        }
        return true;
    }

    private List<FormulaEntry> parseFormulaJson(String raw) {
        String json = raw != null && raw.strip().startsWith("{") ? raw.strip() : LlmResponseParser.extractJsonObject(raw);
        if (json == null) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode arr = root.path("formulas");
            if (!arr.isArray()) {
                return List.of();
            }
            List<FormulaEntry> out = new ArrayList<>();
            for (JsonNode node : arr) {
                String name = node.path("name").asText("").strip();
                String equation = node.path("equation").asText("").strip();
                if (equation.isBlank()) {
                    equation = node.path("equation_latex").asText("").strip();
                }
                String whenToUse = node.path("whenToUse").asText("").strip();
                if (whenToUse.isBlank()) {
                    whenToUse = node.path("when").asText("").strip();
                }
                if (name.isBlank() || equation.isBlank() || whenToUse.isBlank()) {
                    continue;
                }
                out.add(new FormulaEntry(name, equation, whenToUse));
            }
            return out.size() > 2 ? out.subList(0, 2) : out;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String formulaToMarkdown(List<FormulaEntry> entries) {
        if (entries.isEmpty()) {
            return """
                    ### Formulas

                    Could not load formulas for this question. Try **Hint** or **Basics** instead.
                    """
                    .strip();
        }
        StringBuilder sb = new StringBuilder("### Formulas\n\n");
        for (FormulaEntry e : entries) {
            sb.append("**").append(e.name()).append("**\n\n");
            sb.append("- **Equation:** $").append(stripMathDelimiters(e.equation())).append("$\n");
            sb.append("- **When to use:** ").append(e.whenToUse()).append("\n\n");
        }
        return sb.toString().strip();
    }

    private record FormulaEntry(String name, String equation, String whenToUse) {}

    private static String formulaSubjectBlock(Question q) {
        StringBuilder sb = new StringBuilder();
        if (q.getSubject() != null && !q.getSubject().isBlank()) {
            sb.append("Subject: ").append(q.getSubject()).append("\n");
        }
        if (q.getChapter() != null && !q.getChapter().isBlank()) {
            sb.append("Chapter: ").append(q.getChapter()).append("\n");
        }
        if (q.getTopic() != null && !q.getTopic().isBlank()) {
            sb.append("Topic: ").append(q.getTopic()).append("\n");
        }
        if (q.getSubtopic() != null && !q.getSubtopic().isBlank()) {
            sb.append("Subtopic: ").append(q.getSubtopic()).append("\n");
        }
        if (q.getConcepts() != null && !q.getConcepts().isEmpty()) {
            sb.append("Concepts: ").append(String.join(", ", q.getConcepts())).append("\n");
        }
        if (q.getQuestionTextPreview() != null && !q.getQuestionTextPreview().isBlank()) {
            sb.append("Question preview: ").append(q.getQuestionTextPreview()).append("\n");
        }
        return sb.toString().strip();
    }

    private static List<FormulaEntry> magnetismFormulaEntries() {
        return List.of(
                new FormulaEntry(
                        "Force between parallel conductors",
                        "F = \\frac{\\mu_0 I_1 I_2 L}{2\\pi d}",
                        "Force on length L of one wire due to another parallel conductor at separation d."),
                new FormulaEntry(
                        "Net force on a loop near a straight wire",
                        "F_{net} = \\frac{\\mu_0 I i L}{2\\pi}\\left(\\frac{1}{a}-\\frac{1}{a+L}\\right)",
                        "Net force when the nearer side is at distance a and the far side at a+L."));
    }

    private static boolean isMagnetismQuestion(String blob, Question q) {
        if (blob.contains("magnet")
                || blob.contains("conductor")
                || blob.contains("loop")
                || blob.contains("straight wire")
                || blob.contains("parallel")
                || blob.contains("ampere")
                || blob.contains("solenoid")
                || blob.contains("magnetic effect")
                || blob.contains("moving charge")
                || (blob.contains("current") && blob.contains("wire"))) {
            return true;
        }
        String chapter = nullToEmpty(q.getChapter()).toLowerCase(Locale.ROOT);
        String subject = nullToEmpty(q.getSubject()).toLowerCase(Locale.ROOT);
        return subject.contains("physics") && chapter.contains("magnet");
    }

    private static List<FormulaEntry> buildFallbackFormulaEntries(Question q) {
        String blob = (nullToEmpty(q.getChapter()) + " " + nullToEmpty(q.getTopic()) + " "
                        + nullToEmpty(q.getQuestionTextPreview()))
                .toLowerCase(Locale.ROOT);
        if (blob.contains("rms") || blob.contains("kinetic") || blob.contains("molecular speed")) {
            return List.of(new FormulaEntry(
                    "Root Mean Square Velocity",
                    "v_{rms} = \\sqrt{\\frac{3RT}{M}}",
                    "For the same gas, convert °C to Kelvin and use v₂ = v₁√(T₂/T₁)."));
        }
        if (isMagnetismQuestion(blob, q)) {
            return magnetismFormulaEntries();
        }
        return List.of();
    }

    private static String stripMathDelimiters(String latex) {
        return AiTextNormalizer.stripMathDelimiters(latex);
    }

    private AssistResponse explainBasics(AssistRequest req) {
        Question q = requireQuestion(req.questionId());
        if (hasPrebakedBasics(q)) {
            return new AssistResponse("explain_basics", AiTextNormalizer.normalize(buildBasicsFromPrebaked(q)), false, List.of(), null);
        }
        if (!llm.isEnabled()) {
            return new AssistResponse(
                    "explain_basics",
                    AiTextNormalizer.normalize(buildBasicsFromPrebaked(q)),
                    false,
                    List.of(),
                    null);
        }
        boolean afterSubmit = hasSubmittedAnswer(req);
        String studentState =
                afterSubmit
                        ? """
                        Student answer submitted: %s (correct key: %s).
                        You may reference their choice when explaining, but still teach the concept — do not only give the key.
                        """
                                .formatted(req.selectedAnswer(), q.getAnswer())
                        : """
                        Student is still attempting.
                        Do not reveal the final answer or option number.
                        """;

        boolean incompletePreview = isIncompleteQuestionPreview(q);

        String prompt =
                """
                %s

                Question context:
                %s

                Question preview:
                %s
                %s

                Explain this PYQ for the student. Follow your output rules: start with ### Concept, max %d words.
                """
                        .formatted(
                                studentState.strip(),
                                questionMetadataBlock(q),
                                questionPreviewText(q),
                                incompletePreview
                                        ? """

                                        Preview status: INCOMPLETE (diagram/OCR may be missing).
                                        """
                                                .strip()
                                        : "",
                                BASICS_MAX_WORDS);

        String text = AiTextNormalizer.normalize(fetchBasicsText(prompt));
        persistBasicsEnrichment(q, text);
        return new AssistResponse("explain_basics", text, true, List.of(), null);
    }

    private AssistResponse pitfalls(AssistRequest req) {
        Question q = requireQuestion(req.questionId());
        if (hasPrebakedPitfalls(q)) {
            return new AssistResponse(
                    "pitfalls", AiTextNormalizer.normalize(buildPitfallsFromPrebaked(q)), false, List.of(), null);
        }
        if (!llm.isEnabled()) {
            return new AssistResponse(
                    "pitfalls",
                    """
                    No imported pitfalls or practice pattern for this question yet.

                    Re-sync the pack from Admin, or enable the LLM to generate them on first use.
                    """
                            .strip(),
                    false,
                    List.of(),
                    null);
        }
        String prompt =
                """
                Question context:
                %s

                Subject: %s | Chapter: %s | Topic: %s

                List typical NEET mistakes students make on this PYQ type and the recurring practice pattern.
                Start with ### Common mistakes. Max %d words.
                """
                        .formatted(
                                questionPreviewText(q),
                                nullToEmpty(q.getSubject()),
                                nullToEmpty(q.getChapter()),
                                nullToEmpty(q.getTopic()),
                                PITFALLS_MAX_WORDS);
        String text = AiTextNormalizer.normalize(
                llm.complete(SYSTEM_PITFALLS, prompt, LlmCompletionOptions.text(0.2, 320)));
        persistPitfallsEnrichment(q, text);
        return new AssistResponse("pitfalls", text, true, List.of(), null);
    }

    private String fetchBasicsText(String prompt) {
        String best = "";
        for (int attempt = 0; attempt < 2; attempt++) {
            String userPrompt =
                    attempt == 0
                            ? prompt
                            : prompt
                                    + """

                                    RETRY: Invalid format. Line 1 must be exactly ### Concept with no text before it. Max """
                                    + BASICS_MAX_WORDS
                                    + " words. No calculations or option elimination.";
            String raw =
                    llm.complete(
                            SYSTEM_BASICS,
                            userPrompt,
                            LlmCompletionOptions.text(0.0, 0.8, 420));
            String normalized = normalizeBasicsOutput(raw);
            if (basicsOutputValid(normalized)) {
                return normalized;
            }
            if (normalized.length() > best.length()) {
                best = normalized;
            }
        }
        return best.isBlank()
                ? normalizeBasicsOutput(
                        llm.complete(
                                SYSTEM_BASICS,
                                prompt,
                                LlmCompletionOptions.text(0.0, 0.8, 420)))
                : best;
    }

    private static boolean basicsOutputValid(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String t = text.strip();
        if (!t.startsWith("### Concept")) {
            return false;
        }
        if (!t.contains("### Key Formula")) {
            return false;
        }
        if (!t.contains("### How to Approach")) {
            return false;
        }
        if (!t.contains("### Common Mistake")) {
            return false;
        }
        return wordCount(t) <= BASICS_MAX_WORDS + 10;
    }

    private static String normalizeBasicsOutput(String text) {
        String t = stripAiMetaPreamble(text);
        int conceptIdx = t.indexOf("### Concept");
        if (conceptIdx > 0) {
            t = t.substring(conceptIdx);
        }
        if (wordCount(t) > BASICS_MAX_WORDS) {
            t = trimToWordLimit(t, BASICS_MAX_WORDS);
        }
        return t.strip();
    }

    private static int wordCount(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.strip().split("\\s+").length;
    }

    private static String trimToWordLimit(String text, int maxWords) {
        String[] words = text.strip().split("\\s+");
        if (words.length <= maxWords) {
            return text.strip();
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < maxWords; i++) {
            if (i > 0) {
                sb.append(' ');
            }
            sb.append(words[i]);
        }
        return sb.toString().strip();
    }

    /** Remove common LLM meta lines that echo our internal prompt. */
    private static String stripAiMetaPreamble(String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        String t = META_PREAMBLE.matcher(text.strip()).replaceFirst("");
        int conceptIdx = t.indexOf("### Concept");
        if (conceptIdx > 0) {
            t = t.substring(conceptIdx);
        }
        t = t.replaceAll("(?i)for a class 11[-–]12 neet student[,]?\\s*", "");
        t = t.replaceAll("(?i)class 11[-–]12 neet student[,]?\\s*", "");
        t = t.replaceAll("(?im)^mode:\\s*explain from basics\\s*\\n?", "");
        t = t.replaceAll("(?im)^task:\\s*\\n?", "");
        return t.strip();
    }

    private static String questionMetadataBlock(Question q) {
        StringBuilder sb = new StringBuilder();
        sb.append("Exam: ").append(q.getExam()).append(" ").append(q.getYear()).append("\n");
        sb.append("Subject: ").append(q.getSubject()).append("\n");
        if (q.getChapter() != null && !q.getChapter().isBlank()) {
            sb.append("Chapter: ").append(q.getChapter()).append("\n");
        }
        if (q.getTopic() != null && !q.getTopic().isBlank()) {
            sb.append("Topic: ").append(q.getTopic()).append("\n");
        }
        if (q.getSubtopic() != null && !q.getSubtopic().isBlank()) {
            sb.append("Subtopic: ").append(q.getSubtopic()).append("\n");
        }
        if (q.getConcepts() != null && !q.getConcepts().isEmpty()) {
            sb.append("Concepts: ").append(String.join(", ", q.getConcepts())).append("\n");
        }
        sb.append("Difficulty (1-10): ").append(q.getDifficulty());
        return sb.toString();
    }

    private static boolean isIncompleteQuestionPreview(Question q) {
        if (q.isHasDiagram()) {
            return true;
        }
        String preview = q.getQuestionTextPreview();
        if (preview == null || preview.isBlank()) {
            return true;
        }
        return q.isHasEquation() && preview.length() < 80;
    }

    private static String questionPreviewText(Question q) {
        StringBuilder sb = new StringBuilder();
        if (q.getQuestionTextPreview() != null && !q.getQuestionTextPreview().isBlank()) {
            sb.append(q.getQuestionTextPreview().strip());
        } else if (q.isHasDiagram() || q.isHasEquation()) {
            sb.append(
                    "(text preview unavailable — question is mainly image/diagram; infer from chapter, topic, and figure labels)");
        } else {
            sb.append("(no text preview — use chapter/topic/concepts)");
        }
        if (q.getOptions() != null && !q.getOptions().isEmpty()) {
            sb.append("\n\nOptions:");
            for (var opt : q.getOptions()) {
                String id = nullToEmpty(opt.getId()).strip();
                String text = nullToEmpty(opt.getText()).strip();
                if (!id.isBlank() && !text.isBlank()) {
                    sb.append("\n(").append(id).append(") ").append(text);
                }
            }
        }
        return sb.toString().strip();
    }

    private AssistResponse weakChapterAnalysis(String userId) {
        var progress = practiceService.progress(userId);
        List<PracticeService.ChapterProgress> weak = progress.weakChapters();
        if (weak.isEmpty()) {
            return new AssistResponse(
                    "weak_chapter_analysis",
                    "Not enough graded attempts yet — finish at least 10–15 practice questions so we can spot weak chapters.",
                    false,
                    List.of(),
                    "/practice");
        }

        String data =
                weak.stream()
                        .limit(5)
                        .map(w -> w.subject()
                                + " · "
                                + w.chapter()
                                + " — "
                                + w.accuracyPercent()
                                + "% ("
                                + w.attempts()
                                + " attempts, "
                                + w.marks()
                                + " marks)")
                        .collect(Collectors.joining("\n"));

        String prompt =
                """
                Mode: WEAK CHAPTER ANALYSIS
                Student NEET practice stats (weakest first):
                %s

                Overall accuracy: %d%% on %d attempts.

                Prioritize what to fix first, why it matters for NEET, and a 3-step drill plan for this week.
                """
                        .formatted(data, progress.accuracyPercent(), progress.totalAttempts());

        String text = llm.complete(SYSTEM_NEET, prompt, 0.3, 480);
        return new AssistResponse("weak_chapter_analysis", text, true, List.of(), "/analytics");
    }

    private AssistResponse practiceFromWeak(String userId) {
        var progress = practiceService.progress(userId);
        PracticeService.ChapterProgress top = progress.weakChapters().isEmpty()
                ? null
                : progress.weakChapters().get(0);
        if (top == null) {
            return new AssistResponse(
                    "practice_from_weak",
                    "Start a scored practice session first — we'll tailor weak-area drills after your attempts sync.",
                    false,
                    List.of(),
                    "/practice");
        }

        String params = "exam=NEET&subject="
                + urlEncode(top.subject())
                + "&chapter="
                + urlEncode(top.chapter());
        String actionUrl = "/practice?" + params;

        String prompt =
                """
                Mode: PRACTICE FROM WEAK AREAS
                Weakest chapter: %s · %s — %d%% accuracy (%d attempts).

                In 3–4 sentences, tell the student how to use a focused 20-question adaptive session on this chapter.
                """
                        .formatted(top.subject(), top.chapter(), top.accuracyPercent(), top.attempts());

        String text = llm.complete(SYSTEM_NEET, prompt, 0.35, 280);
        return new AssistResponse("practice_from_weak", text, true, List.of(), actionUrl);
    }

    private AssistResponse revisionNotes(AssistRequest req) {
        Question q = req.questionId() != null && !req.questionId().isBlank()
                ? requireQuestion(req.questionId())
                : null;

        if (q != null && hasRevisionNotes(q)) {
            return new AssistResponse("revision_notes", q.getRevisionNotes().strip(), false, List.of(), null);
        }

        requireLlmAvailable();

        String prompt;
        if (q != null) {
            prompt =
                    """
                    Question context:
                    %s

                    Correct answer key: %s

                    Write revision notes with exactly these sections:

                    ### Key facts
                    - bullets; inline math as $I=\\frac{1}{2}MR^2$

                    ### Common mistakes
                    - bullets

                    ### Memory hook
                    One short memorable line.
                    """
                            .formatted(questionBlock(q), q.getAnswer());
        } else {
            prompt =
                    """
                    The student is revising bookmarked NEET PYQs.
                    Give a checklist for effective same-day revision (active recall, error log, timed re-attempt)
                    in under 120 words. Use short bullets only — no preamble.
                    """;
        }

        String text = AiTextNormalizer.normalize(llm.complete(SYSTEM_REVISION, prompt, 0.3, 420));
        if (q != null) {
            persistRevisionNotes(q, text);
        }
        return new AssistResponse("revision_notes", text, true, List.of(), null);
    }

    private AssistResponse mentor(String userId) {
        var progress = practiceService.progress(userId);
        String prompt =
                """
                Mode: AI MENTOR (weekly study coach, not open-ended chat)
                Attempts: %d | Accuracy: %d%% | Recent sessions: %d

                Give a motivating weekly plan: daily question target, when to review mistakes, and one habit to keep.
                Keep it actionable for a NEET repeater/first-timer.
                """
                        .formatted(
                                progress.totalAttempts(),
                                progress.accuracyPercent(),
                                progress.recentSessions().size());

        String text = llm.complete(SYSTEM_NEET, prompt, 0.45, 400);
        return new AssistResponse("mentor", text, true, List.of(), "/practice");
    }

    private AssistResponse similarQuestions(AssistRequest req) {
        Question q = requireQuestion(req.questionId());
        List<SimilarQuestionRef> similar = findSimilar(q, 4);
        String text = resolveSimilarIntroText(q, similar.size());
        return new AssistResponse("similar_questions", text, false, similar, bankUrl(q));
    }

    private String resolveSimilarIntroText(Question q, int similarCount) {
        if (similarCount == 0) {
            return syllabusScopeLabel(q)
                    + " — no other PYQs matched in the bank yet. Try the chapter filter in Question Bank.";
        }
        String scope = syllabusScopeLabel(q);
        return """
                Practice these %d related PYQs (%s) — look for the recurring concept and solution pattern before comparing options.
                """
                .formatted(similarCount, scope)
                .strip();
    }

    private static boolean hasPrebakedPitfalls(Question q) {
        if (!nullToEmpty(q.getPracticePattern()).strip().isBlank()) {
            return true;
        }
        return q.getCommonMistakes() != null
                && q.getCommonMistakes().stream().anyMatch(m -> !nullToEmpty(m).strip().isBlank());
    }

    private String buildPitfallsFromPrebaked(Question q) {
        StringBuilder sb = new StringBuilder();
        List<String> mistakes = q.getCommonMistakes();
        boolean hasMistakes =
                mistakes != null && mistakes.stream().anyMatch(m -> !nullToEmpty(m).strip().isBlank());
        if (hasMistakes) {
            sb.append("### Common mistakes\n\n");
            for (String mistake : mistakes) {
                String text = nullToEmpty(mistake).strip();
                if (!text.isBlank()) {
                    sb.append("- ").append(AiTextNormalizer.sanitizeEnrichmentText(text)).append("\n");
                }
            }
            sb.append("\n");
        }
        String pattern = nullToEmpty(q.getPracticePattern()).strip();
        if (!pattern.isBlank()) {
            sb.append("### Practice pattern\n\n");
            sb.append(AiTextNormalizer.sanitizeEnrichmentText(pattern)).append("\n");
        }
        return sb.toString().strip();
    }

    private static String syllabusScopeLabel(Question q) {
        List<String> parts = new ArrayList<>();
        addLabelPart(parts, q.getSubject());
        addLabelPart(parts, q.getChapter());
        addLabelPart(parts, q.getTopic());
        addLabelPart(parts, q.getSubtopic());
        return parts.isEmpty() ? "same syllabus area" : String.join(" · ", parts);
    }

    private static void addLabelPart(List<String> parts, String value) {
        String label = label(value);
        if (!label.isBlank()) {
            parts.add(label);
        }
    }

    private List<SimilarQuestionRef> findSimilar(Question anchor, int limit) {
        String exam = label(anchor.getExam());
        if (exam.isBlank()) {
            exam = "NEET";
        }
        String subject = label(anchor.getSubject());
        String chapter = label(anchor.getChapter());
        String topic = label(anchor.getTopic());
        String subtopic = label(anchor.getSubtopic());
        String excludeId = anchor.getQuestionId();

        Set<String> seen = new LinkedHashSet<>();
        seen.add(excludeId);
        List<SimilarQuestionRef> out = new ArrayList<>();
        PageRequest page = PageRequest.of(0, limit + 1);

        if (!subject.isBlank() && !chapter.isBlank() && !topic.isBlank() && !subtopic.isBlank()) {
            collectSimilar(
                    out,
                    seen,
                    questions
                            .findByExamIgnoreCaseAndSubjectIgnoreCaseAndChapterIgnoreCaseAndTopicIgnoreCaseAndSubtopicIgnoreCaseAndQuestionIdNot(
                                    exam, subject, chapter, topic, subtopic, excludeId, page),
                    limit);
        }
        if (out.size() < limit && !subject.isBlank() && !chapter.isBlank() && !topic.isBlank()) {
            collectSimilar(
                    out,
                    seen,
                    questions.findByExamIgnoreCaseAndSubjectIgnoreCaseAndChapterIgnoreCaseAndTopicIgnoreCaseAndQuestionIdNot(
                            exam, subject, chapter, topic, excludeId, page),
                    limit);
        }
        if (out.size() < limit && !subject.isBlank() && !chapter.isBlank()) {
            collectSimilar(
                    out,
                    seen,
                    questions.findByExamIgnoreCaseAndSubjectIgnoreCaseAndChapterIgnoreCaseAndQuestionIdNot(
                            exam, subject, chapter, excludeId, page),
                    limit);
        }
        if (out.size() < limit && !subject.isBlank()) {
            collectSimilar(
                    out,
                    seen,
                    questions.findByExamIgnoreCaseAndSubjectIgnoreCaseAndQuestionIdNot(
                            exam, subject, excludeId, page),
                    limit);
        }
        return out;
    }

    private static void collectSimilar(
            List<SimilarQuestionRef> out, Set<String> seen, List<Question> pool, int limit) {
        for (Question q : pool) {
            if (!seen.add(q.getQuestionId())) {
                continue;
            }
            out.add(toSimilarRef(q));
            if (out.size() >= limit) {
                return;
            }
        }
    }

    private static SimilarQuestionRef toSimilarRef(Question q) {
        return new SimilarQuestionRef(
                q.getQuestionId(),
                q.getQuestionNo(),
                q.getSubject(),
                q.getChapter(),
                q.getTopic(),
                q.getSubtopic(),
                q.getQuestionTextPreview());
    }

    private static String label(String value) {
        return nullToEmpty(value).strip();
    }

    private static String bankUrl(Question q) {
        return "/bank?exam=NEET&subject="
                + urlEncode(q.getSubject())
                + (q.getChapter() != null && !q.getChapter().isBlank()
                        ? "&chapter=" + urlEncode(q.getChapter())
                        : "");
    }

    private Question requireQuestion(String questionId) {
        if (questionId == null || questionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "questionId is required");
        }
        return practiceService.requireQuestion(questionId);
    }

    private void requirePlatformEnabled() {
        var settings = platformSettingsService.requireSettings();
        if (!settings.isAiSuggestEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI practice features are disabled");
        }
    }

    private void requireLlmAvailable() {
        if (!llm.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "LLM not configured — set OPENAI_API_KEY and start FreeLLMAPI");
        }
    }

    private static boolean hasPrebakedHints(Question q) {
        List<String> hints = q.getHints();
        if (hints == null || hints.size() < 3) {
            return false;
        }
        List<String> usable =
                hints.stream().map(PracticeAiService::nullToEmpty).map(String::strip).filter(s -> s.length() >= 15).toList();
        return usable.size() >= 3;
    }

    private static List<String> prebakedHintSteps(Question q) {
        return q.getHints().stream()
                .map(PracticeAiService::nullToEmpty)
                .map(String::strip)
                .filter(s -> !s.isBlank())
                .limit(3)
                .toList();
    }

    private static boolean hasPrebakedBasics(Question q) {
        if (!nullToEmpty(q.getConceptExplanation()).strip().isBlank()) {
            return true;
        }
        return hasPrebakedHints(q)
                || (q.getCommonMistakes() != null
                        && q.getCommonMistakes().stream().anyMatch(m -> !nullToEmpty(m).strip().isBlank()));
    }

    private List<FormulaEntry> prebakedFormulaEntries(Question q) {
        if (q.getFormulaCards() == null || q.getFormulaCards().isEmpty()) {
            return List.of();
        }
        List<FormulaEntry> out = new ArrayList<>();
        for (var card : q.getFormulaCards()) {
            String name = nullToEmpty(card.getName()).strip();
            String equation = nullToEmpty(card.getFormula()).strip();
            String whenToUse = nullToEmpty(card.getDescription()).strip();
            if (name.isBlank() && equation.isBlank()) {
                continue;
            }
            if (name.isBlank()) {
                name = "Key formula";
            }
            if (whenToUse.isBlank()) {
                whenToUse = "Use when solving this type of question.";
            }
            if (equation.isBlank()) {
                continue;
            }
            equation = AiTextNormalizer.normalizeFormulaLatex(equation);
            out.add(new FormulaEntry(name, equation, whenToUse));
        }
        return out.size() > 2 ? out.subList(0, 2) : out;
    }

    private String buildBasicsFromPrebaked(Question q) {
        StringBuilder sb = new StringBuilder();
        sb.append("### Concept\n\n");
        String concept = nullToEmpty(q.getConceptExplanation()).strip();
        if (!concept.isBlank()) {
            sb.append(AiTextNormalizer.sanitizeEnrichmentText(concept)).append("\n\n");
        } else if (q.getChapter() != null && !q.getChapter().isBlank()) {
            sb.append("Core idea from **")
                    .append(q.getChapter())
                    .append("**")
                    .append(q.getTopic() != null && !q.getTopic().isBlank() ? " · " + q.getTopic() : "")
                    .append(" — use the hints below to work through this PYQ.\n\n");
        } else {
            sb.append("Work through the hints and formulas for this chapter before picking an option.\n\n");
        }

        sb.append("### Key Formula(s)\n\n");
        List<FormulaEntry> formulas = prebakedFormulaEntries(q);
        if (formulas.isEmpty()) {
            sb.append("No single key formula — this question is primarily concept or reasoning based.\n\n");
        } else {
            for (FormulaEntry entry : formulas) {
                sb.append("- **")
                        .append(entry.name())
                        .append("**: $")
                        .append(stripMathDelimiters(entry.equation()))
                        .append("$ — ")
                        .append(entry.whenToUse())
                        .append("\n");
            }
            sb.append("\n");
        }

        sb.append("### How to Approach This Question\n\n");
        List<String> hints = q.getHints();
        if (hints != null && !hints.isEmpty()) {
            int step = 1;
            for (String hint : hints) {
                String text = nullToEmpty(hint).strip();
                if (!text.isBlank()) {
                    sb.append(step++).append(". ").append(text).append("\n");
                }
            }
        } else {
            sb.append("1. Identify the core concept from the chapter and topic.\n");
            sb.append("2. Recall the key formula, law, or relation needed.\n");
            sb.append("3. Set up the problem using the given information before picking an option.\n");
        }
        sb.append("\n");

        return sb.toString().strip();
    }

    private void requireAvailable() {
        requirePlatformEnabled();
        requireLlmAvailable();
    }

    private static String questionBlock(Question q) {
        return questionBlock(q, true);
    }

    private static String questionBlock(Question q, boolean includeSolutionPreview) {
        StringBuilder sb = new StringBuilder();
        sb.append("Exam: ").append(q.getExam()).append(" ").append(q.getYear()).append("\n");
        sb.append("Subject: ").append(q.getSubject()).append("\n");
        if (q.getChapter() != null && !q.getChapter().isBlank()) {
            sb.append("Chapter: ").append(q.getChapter()).append("\n");
        }
        if (q.getTopic() != null && !q.getTopic().isBlank()) {
            sb.append("Topic: ").append(q.getTopic()).append("\n");
        }
        if (q.getSubtopic() != null && !q.getSubtopic().isBlank()) {
            sb.append("Subtopic: ").append(q.getSubtopic()).append("\n");
        }
        if (q.getConcepts() != null && !q.getConcepts().isEmpty()) {
            sb.append("Concepts: ").append(String.join(", ", q.getConcepts())).append("\n");
        }
        if (q.isHasEquation()) {
            sb.append("Note: question involves equations/diagrams — text preview may be incomplete.\n");
        }
        if (q.getQuestionTextPreview() != null && !q.getQuestionTextPreview().isBlank()) {
            sb.append("Question preview: ").append(q.getQuestionTextPreview()).append("\n");
        } else if (!includeSolutionPreview) {
            sb.append("Question preview: (image-only — infer from chapter/topic/concepts)\n");
        }
        if (includeSolutionPreview
                && q.getSolutionTextPreview() != null
                && !q.getSolutionTextPreview().isBlank()) {
            sb.append("Solution preview: ").append(q.getSolutionTextPreview()).append("\n");
        }
        sb.append("Difficulty (1-10): ").append(q.getDifficulty());
        return sb.toString();
    }

    private static boolean hasRevisionNotes(Question q) {
        return !nullToEmpty(q.getRevisionNotes()).strip().isBlank();
    }

    private static String lookupWhyWrongExplanation(Question q, String selectedAnswer) {
        if (q.getWhyWrongByAnswer() == null || q.getWhyWrongByAnswer().isEmpty()) {
            return null;
        }
        String key = selectedAnswer.strip();
        String text = q.getWhyWrongByAnswer().get(key);
        if (text == null || text.isBlank()) {
            return null;
        }
        return text.strip();
    }

    private void persistHintEnrichment(Question q, List<String> steps) {
        if (!hintsAreUsable(steps) || AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.HINTS)) {
            return;
        }
        q.setHints(new ArrayList<>(steps.subList(0, 3)));
        saveQuestionEnrichment(q);
    }

    private void persistFormulaEnrichment(Question q, List<FormulaEntry> entries) {
        if (!formulasAreUsable(entries)
                || AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.FORMULA_CARDS)) {
            return;
        }
        List<FormulaCard> cards = new ArrayList<>();
        for (FormulaEntry entry : entries) {
            FormulaCard card = new FormulaCard();
            card.setName(entry.name());
            card.setFormula(AiTextNormalizer.normalizeFormulaLatex(entry.equation()));
            card.setDescription(entry.whenToUse());
            cards.add(card);
        }
        q.setFormulaCards(cards);
        saveQuestionEnrichment(q);
    }

    private void persistPitfallsEnrichment(Question q, String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return;
        }
        boolean changed = false;
        List<String> mistakes = extractBulletLines(extractMarkdownSection(markdown, "Common mistakes"));
        if (!mistakes.isEmpty()
                && !AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.COMMON_MISTAKES)) {
            q.setCommonMistakes(mistakes);
            changed = true;
        }
        String pattern = extractMarkdownSection(markdown, "Practice pattern");
        if (!pattern.isBlank() && !AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.PRACTICE_PATTERN)) {
            q.setPracticePattern(AiTextNormalizer.sanitizeEnrichmentText(pattern));
            changed = true;
        }
        if (changed) {
            saveQuestionEnrichment(q);
        }
    }

    private void persistBasicsEnrichment(Question q, String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return;
        }
        boolean changed = false;
        String concept = extractMarkdownSection(markdown, "Concept");
        if (!concept.isBlank()
                && !AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.CONCEPT_EXPLANATION)) {
            q.setConceptExplanation(AiTextNormalizer.sanitizeEnrichmentText(concept));
            changed = true;
        }
        List<String> mistakes = extractBulletLines(extractMarkdownSection(markdown, "Common Mistake"));
        if (!mistakes.isEmpty()
                && !AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.COMMON_MISTAKES)) {
            q.setCommonMistakes(mistakes);
            changed = true;
        }
        if (!hasPrebakedHints(q) && !AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.HINTS)) {
            List<String> approach =
                    extractNumberedLines(extractMarkdownSection(markdown, "How to Approach This Question"));
            if (approach.size() >= 3) {
                q.setHints(new ArrayList<>(approach.subList(0, 3)));
                changed = true;
            }
        }
        if (changed) {
            saveQuestionEnrichment(q);
        }
    }

    private void persistRevisionNotes(Question q, String text) {
        if (text == null
                || text.isBlank()
                || AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.REVISION_NOTES)) {
            return;
        }
        q.setRevisionNotes(text.strip());
        saveQuestionEnrichment(q);
    }

    private void persistWhyWrongExplanation(Question q, String selectedAnswer, String text) {
        if (text == null
                || text.isBlank()
                || AdminQuestionPreserve.isLocked(q, AdminQuestionPreserve.WHY_WRONG)) {
            return;
        }
        Map<String, String> map =
                q.getWhyWrongByAnswer() != null ? new LinkedHashMap<>(q.getWhyWrongByAnswer()) : new LinkedHashMap<>();
        map.put(selectedAnswer.strip(), text.strip());
        q.setWhyWrongByAnswer(map);
        saveQuestionEnrichment(q);
    }

    private void saveQuestionEnrichment(Question q) {
        questions.save(q);
    }

    private static String extractMarkdownSection(String markdown, String heading) {
        Pattern pattern =
                Pattern.compile(
                        "(?is)###\\s*" + Pattern.quote(heading) + "\\s*\\n+(.*?)(?=\\n###\\s|$)");
        Matcher matcher = pattern.matcher(markdown);
        if (!matcher.find()) {
            return "";
        }
        return matcher.group(1).strip();
    }

    private static List<String> extractBulletLines(String body) {
        if (body == null || body.isBlank()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String line : body.split("\n")) {
            String trimmed = line.strip();
            if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
                String item = trimmed.replaceFirst("^[-•]\\s*", "").strip();
                if (!item.isBlank()) {
                    out.add(item);
                }
            }
        }
        return out;
    }

    private static List<String> extractNumberedLines(String body) {
        if (body == null || body.isBlank()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String line : body.split("\n")) {
            String trimmed = line.strip();
            if (trimmed.matches("^\\d+\\.\\s+.+")) {
                String item = trimmed.replaceFirst("^\\d+\\.\\s*", "").strip();
                if (!item.isBlank()) {
                    out.add(item);
                }
            }
        }
        return out;
    }

    private static String normalizeFeature(String feature) {
        if (feature == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "feature is required");
        }
        return feature.trim().toLowerCase(Locale.ROOT).replace('-', '_');
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String urlEncode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    /** Admin: catalog of AI features with prompt templates for manual ChatGPT review. */
    public List<PromptFeatureInfo> listPromptFeatures() {
        return List.of(
                new PromptFeatureInfo("why_wrong", "Why is my answer wrong?", true, false, true),
                new PromptFeatureInfo("hint", "Give me a hint", true, false, false),
                new PromptFeatureInfo("formula", "Key formulas", true, false, false),
                new PromptFeatureInfo("explain_basics", "Explain from basics", true, false, true),
                new PromptFeatureInfo("pitfalls", "Common mistakes & pattern", true, false, false),
                new PromptFeatureInfo("revision_notes", "Revision notes", true, false, false),
                new PromptFeatureInfo("similar_questions", "Similar questions", true, false, false),
                new PromptFeatureInfo("weak_chapter_analysis", "Weak chapter analysis", false, true, false),
                new PromptFeatureInfo("practice_from_weak", "Practice from weak areas", false, true, false),
                new PromptFeatureInfo("mentor", "AI mentor", false, true, false));
    }

    public PromptView resolvePrompt(String userId, String feature, String questionId, String selectedAnswer) {
        String normalized = normalizeFeature(feature);
        return switch (normalized) {
            case "why_wrong" -> resolveWhyWrongPrompt(questionId, selectedAnswer);
            case "hint" -> resolveHintPrompt(questionId);
            case "formula" -> resolveFormulaPrompt(questionId);
            case "explain_basics" -> resolveBasicsPrompt(questionId, selectedAnswer);
            case "pitfalls" -> resolvePitfallsPrompt(questionId);
            case "revision_notes" -> resolveRevisionNotesPrompt(questionId);
            case "similar_questions" -> resolveSimilarQuestionsPrompt(questionId);
            case "weak_chapter_analysis" -> resolveWeakChapterPrompt(userId);
            case "practice_from_weak" -> resolvePracticeFromWeakPrompt(userId);
            case "mentor" -> resolveMentorPrompt(userId);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown feature: " + feature);
        };
    }

    private PromptView resolveWhyWrongPrompt(String questionId, String selectedAnswer) {
        Question q = requireQuestion(questionId);
        String chosen = selectedAnswer != null && !selectedAnswer.isBlank() ? selectedAnswer.strip() : "2";
        String userPrompt =
                """
                Mode: WHY WRONG
                The student already submitted and got this wrong.

                Question context:
                %s

                Correct answer key: %s
                Student chose: %s

                Explain the likely misconception and the correct reasoning path. Name the concept tested.
                Do not be harsh; be specific to this question.
                """
                        .formatted(questionBlock(q), q.getAnswer(), chosen);
        return new PromptView(
                "why_wrong",
                "Why is my answer wrong?",
                SYSTEM_NEET,
                userPrompt,
                "Cached per wrong option in whyWrongByAnswer. Override in Admin enrichment.");
    }

    private PromptView resolveHintPrompt(String questionId) {
        Question q = requireQuestion(questionId);
        var caps = llm.capabilitiesForConfiguredModel();
        boolean structured = caps.supportsJsonMode() || caps.supportsJsonSchema();
        String system = structured ? SYSTEM_HINT_JSON : SYSTEM_HINT_PLAIN;
        String userPrompt = buildHintUserPrompt(q, structured);
        return new PromptView(
                "hint",
                "Give me a hint",
                system,
                userPrompt,
                "Cached as hints[3] on the question document after first LLM hit.");
    }

    private PromptView resolveFormulaPrompt(String questionId) {
        Question q = requireQuestion(questionId);
        String userPrompt =
                """
                %s

                List the 1–2 most important formulas needed for this PYQ.
                The student has NOT submitted the answer.
                """
                        .formatted(formulaSubjectBlock(q));
        String notes =
                FormulaEligibility.questionNeedsFormula(q)
                        ? "Cached as formulaCards after first LLM hit."
                        : "This question is marked concept-based — formula feature returns a static message to students.";
        return new PromptView("formula", "Key formulas", SYSTEM_FORMULA, userPrompt, notes);
    }

    private PromptView resolveBasicsPrompt(String questionId, String selectedAnswer) {
        Question q = requireQuestion(questionId);
        boolean afterSubmit = selectedAnswer != null && !selectedAnswer.isBlank();
        String studentState =
                afterSubmit
                        ? """
                        Student answer submitted: %s (correct key: %s).
                        You may reference their choice when explaining, but still teach the concept — do not only give the key.
                        """
                                .formatted(selectedAnswer.strip(), q.getAnswer())
                        : """
                        Student is still attempting.
                        Do not reveal the final answer or option number.
                        """;
        boolean incompletePreview = isIncompleteQuestionPreview(q);
        String userPrompt =
                """
                %s

                Question context:
                %s

                Question preview:
                %s
                %s

                Explain this PYQ for the student. Follow your output rules: start with ### Concept, max %d words.
                """
                        .formatted(
                                studentState.strip(),
                                questionMetadataBlock(q),
                                questionPreviewText(q),
                                incompletePreview
                                        ? """

                                        Preview status: INCOMPLETE (diagram/OCR may be missing).
                                        """
                                                .strip()
                                        : "",
                                BASICS_MAX_WORDS);
        return new PromptView(
                "explain_basics",
                "Explain from basics",
                SYSTEM_BASICS,
                userPrompt,
                "Cached as conceptExplanation, commonMistakes, and hints after first LLM hit.");
    }

    private PromptView resolvePitfallsPrompt(String questionId) {
        Question q = requireQuestion(questionId);
        String userPrompt =
                """
                Question context:
                %s

                Subject: %s | Chapter: %s | Topic: %s

                List typical NEET mistakes students make on this PYQ type and the recurring practice pattern.
                Start with ### Common mistakes. Max %d words.
                """
                        .formatted(
                                questionPreviewText(q),
                                nullToEmpty(q.getSubject()),
                                nullToEmpty(q.getChapter()),
                                nullToEmpty(q.getTopic()),
                                PITFALLS_MAX_WORDS);
        return new PromptView(
                "pitfalls",
                "Common mistakes & pattern",
                SYSTEM_PITFALLS,
                userPrompt,
                "Cached as commonMistakes and practicePattern after first LLM hit.");
    }

    private PromptView resolveRevisionNotesPrompt(String questionId) {
        if (questionId == null || questionId.isBlank()) {
            String userPrompt =
                    """
                    The student is revising bookmarked NEET PYQs.
                    Give a checklist for effective same-day revision (active recall, error log, timed re-attempt)
                    in under 120 words. Use short bullets only — no preamble.
                    """;
            return new PromptView(
                    "revision_notes",
                    "Revision notes",
                    SYSTEM_REVISION,
                    userPrompt,
                    "Global revision mode when no questionId is passed to assist().");
        }
        Question q = requireQuestion(questionId);
        String userPrompt =
                """
                Question context:
                %s

                Correct answer key: %s

                Write revision notes with exactly these sections:

                ### Key facts
                - bullets; inline math as $I=\\frac{1}{2}MR^2$

                ### Common mistakes
                - bullets

                ### Memory hook
                One short memorable line.
                """
                        .formatted(questionBlock(q), q.getAnswer());
        return new PromptView(
                "revision_notes",
                "Revision notes",
                SYSTEM_REVISION,
                userPrompt,
                "Cached as revisionNotes after first LLM hit.");
    }

    private PromptView resolveSimilarQuestionsPrompt(String questionId) {
        Question q = requireQuestion(questionId);
        return new PromptView(
                "similar_questions",
                "Similar questions",
                "",
                "No LLM prompt — server queries the question bank by exam/subject/chapter/topic/subtopic.\n\n"
                        + "Anchor: "
                        + q.getQuestionId()
                        + " · "
                        + q.getSubject()
                        + " · "
                        + q.getChapter()
                        + " · "
                        + q.getTopic(),
                "Returns related PYQ links from MongoDB, not generated text.");
    }

    private PromptView resolveWeakChapterPrompt(String userId) {
        var progress = practiceService.progress(userId);
        String data =
                progress.weakChapters().stream()
                        .limit(5)
                        .map(w -> w.subject()
                                + " · "
                                + w.chapter()
                                + " — "
                                + w.accuracyPercent()
                                + "% ("
                                + w.attempts()
                                + " attempts, "
                                + w.marks()
                                + " marks)")
                        .collect(Collectors.joining("\n"));
        String userPrompt =
                """
                Mode: WEAK CHAPTER ANALYSIS
                Student NEET practice stats (weakest first):
                %s

                Overall accuracy: %d%% on %d attempts.

                Prioritize what to fix first, why it matters for NEET, and a 3-step drill plan for this week.
                """
                        .formatted(data, progress.accuracyPercent(), progress.totalAttempts());
        return new PromptView(
                "weak_chapter_analysis",
                "Weak chapter analysis",
                SYSTEM_NEET,
                userPrompt,
                "Uses live student progress — not cached on a question.");
    }

    private PromptView resolvePracticeFromWeakPrompt(String userId) {
        var progress = practiceService.progress(userId);
        PracticeService.ChapterProgress top = progress.weakChapters().isEmpty()
                ? null
                : progress.weakChapters().get(0);
        String userPrompt =
                top == null
                        ? "(No weak chapter data yet — student needs more attempts.)"
                        : """
                        Mode: PRACTICE FROM WEAK AREAS
                        Weakest chapter: %s · %s — %d%% accuracy (%d attempts).

                        In 3–4 sentences, tell the student how to use a focused 20-question adaptive session on this chapter.
                        """
                                .formatted(
                                        top.subject(),
                                        top.chapter(),
                                        top.accuracyPercent(),
                                        top.attempts());
        return new PromptView(
                "practice_from_weak",
                "Practice from weak areas",
                SYSTEM_NEET,
                userPrompt,
                "Uses live student progress — not cached on a question.");
    }

    private PromptView resolveMentorPrompt(String userId) {
        var progress = practiceService.progress(userId);
        String userPrompt =
                """
                Mode: AI MENTOR (weekly study coach, not open-ended chat)
                Attempts: %d | Accuracy: %d%% | Recent sessions: %d

                Give a motivating weekly plan: daily question target, when to review mistakes, and one habit to keep.
                Keep it actionable for a NEET repeater/first-timer.
                """
                        .formatted(
                                progress.totalAttempts(),
                                progress.accuracyPercent(),
                                progress.recentSessions().size());
        return new PromptView(
                "mentor",
                "AI mentor",
                SYSTEM_NEET,
                userPrompt,
                "Uses live student progress — not cached on a question.");
    }

    public record PromptFeatureInfo(
            String id, String label, boolean questionScoped, boolean userScoped, boolean usesSelectedAnswer) {}

    public record PromptView(
            String feature, String label, String systemPrompt, String userPrompt, String notes) {}

    public record StatusView(
            boolean available, boolean llmConfigured, boolean platformEnabled, boolean serverEnabled) {}

    public record AssistRequest(String feature, String questionId, String selectedAnswer) {}

    public record SimilarQuestionRef(
            String questionId,
            int questionNo,
            String subject,
            String chapter,
            String topic,
            String subtopic,
            String questionTextPreview) {}

    public record AssistResponse(
            String feature,
            String text,
            boolean llm,
            List<SimilarQuestionRef> similarQuestions,
            String actionUrl,
            List<String> hintSteps) {

        public AssistResponse(
                String feature,
                String text,
                boolean llm,
                List<SimilarQuestionRef> similarQuestions,
                String actionUrl) {
            this(feature, text, llm, similarQuestions, actionUrl, List.of());
        }
    }
}

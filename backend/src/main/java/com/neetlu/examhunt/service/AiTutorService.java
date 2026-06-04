package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.PlatformSettings;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
@Service
public class AiTutorService {

    private final PlatformSettingsService platformSettingsService;

    public AiTutorService(PlatformSettingsService platformSettingsService) {
        this.platformSettingsService = platformSettingsService;
    }

    public ChatReply chat(String message, String questionId, String context) {
        PlatformSettings s = platformSettingsService.requireSettings();
        if (!s.isAiTutorMockEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI Tutor is in preview mode");
        }
        String trimmed = message == null ? "" : message.trim();
        if (trimmed.isEmpty()) {
            return new ChatReply(s.getAiTutorWelcome(), "welcome", false);
        }
        String lower = trimmed.toLowerCase();
        for (Map.Entry<String, String> e : s.getAiTutorKeywordReplies().entrySet()) {
            if (matchesKeywords(lower, e.getKey())) {
                return new ChatReply(appendContext(e.getValue(), questionId, context), "keyword", true);
            }
        }
        List<String> fallbacks = s.getAiTutorFallbackReplies();
        String reply = fallbacks.isEmpty()
                ? "Try breaking the question into smaller steps and check the solution after one honest attempt."
                : fallbacks.get(ThreadLocalRandom.current().nextInt(fallbacks.size()));
        return new ChatReply(appendContext(reply, questionId, context), "fallback", true);
    }

    public HintReply hint(String mode, String questionId) {
        PlatformSettings s = platformSettingsService.requireSettings();
        if (!s.isAiTutorMockEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI Tutor is in preview mode");
        }
        String text = switch (mode == null ? "" : mode.toLowerCase()) {
            case "explain" ->
                    "Explain mode: identify the concept tested, list givens, then predict the formula before opening the solution.";
            case "hint" ->
                    "Hint: eliminate two options using units or limiting cases, then compare the remaining pair.";
            default -> "Ask a specific doubt in the chat, or use Hint / Explain for this question.";
        };
        if (questionId != null && !questionId.isBlank()) {
            text += " (Question " + questionId + ")";
        }
        return new HintReply(text, mode == null ? "hint" : mode);
    }

    private static boolean matchesKeywords(String message, String patternSpec) {
        for (String part : patternSpec.split("\\|")) {
            String p = part.trim().toLowerCase();
            if (!p.isEmpty() && message.contains(p)) {
                return true;
            }
        }
        return false;
    }

    private static String appendContext(String reply, String questionId, String context) {
        if (context != null && !context.isBlank()) {
            return reply + "\n\n(Context: " + context.trim() + ")";
        }
        if (questionId != null && !questionId.isBlank()) {
            return reply + "\n\n(Tied to PYQ " + questionId + " — open the solution after you attempt it.)";
        }
        return reply;
    }

    public record ChatReply(String reply, String source, boolean mock) {}

    public record HintReply(String text, String mode) {}
}

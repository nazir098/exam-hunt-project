package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.AiTutorService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-tutor")
public class AiTutorController {

    private final AiTutorService aiTutorService;

    public AiTutorController(AiTutorService aiTutorService) {
        this.aiTutorService = aiTutorService;
    }

    @PostMapping("/chat")
    public AiTutorService.ChatReply chat(
            @AuthenticationPrincipal String userId, @RequestBody ChatBody body) {
        return aiTutorService.chat(body.message(), body.questionId(), body.context());
    }

    @PostMapping("/hint")
    public AiTutorService.HintReply hint(
            @AuthenticationPrincipal String userId, @RequestBody HintBody body) {
        return aiTutorService.hint(body.mode(), body.questionId());
    }

    public record ChatBody(String message, String questionId, String context) {}

    public record HintBody(String mode, String questionId) {}
}

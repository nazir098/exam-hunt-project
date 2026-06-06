package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.PracticeAiService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/practice-ai")
public class PracticeAiController {

    private final PracticeAiService practiceAiService;

    public PracticeAiController(PracticeAiService practiceAiService) {
        this.practiceAiService = practiceAiService;
    }

    @GetMapping("/status")
    public PracticeAiService.StatusView status() {
        return practiceAiService.status();
    }

    @PostMapping("/assist")
    public PracticeAiService.AssistResponse assist(
            @AuthenticationPrincipal String userId, @RequestBody PracticeAiService.AssistRequest body) {
        return practiceAiService.assist(userId, body);
    }
}

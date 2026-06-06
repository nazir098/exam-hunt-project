package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.FreeLlmClient;
import com.neetlu.examhunt.service.PlatformSettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final PlatformSettingsService platformSettingsService;
    private final FreeLlmClient freeLlmClient;

    public SettingsController(PlatformSettingsService platformSettingsService, FreeLlmClient freeLlmClient) {
        this.platformSettingsService = platformSettingsService;
        this.freeLlmClient = freeLlmClient;
    }

    @GetMapping("/public")
    public PlatformSettingsService.PublicSettingsView publicSettings() {
        var settings = platformSettingsService.requireSettings();
        boolean llmOk = freeLlmClient.isConfigured();
        return platformSettingsService.toPublicView(settings, llmOk);
    }
}

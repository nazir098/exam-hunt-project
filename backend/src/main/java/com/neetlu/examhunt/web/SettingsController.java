package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.PlatformSettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final PlatformSettingsService platformSettingsService;

    public SettingsController(PlatformSettingsService platformSettingsService) {
        this.platformSettingsService = platformSettingsService;
    }

    @GetMapping("/public")
    public PlatformSettingsService.PublicSettingsView publicSettings() {
        return platformSettingsService.toPublicView(platformSettingsService.requireSettings());
    }
}

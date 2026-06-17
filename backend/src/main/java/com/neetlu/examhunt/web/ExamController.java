package com.neetlu.examhunt.web;

import com.neetlu.examhunt.config.PublicApiCacheProperties;
import com.neetlu.examhunt.service.ExamCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamCatalogService examCatalogService;
    private final PublicApiCacheProperties cacheProperties;

    public ExamController(ExamCatalogService examCatalogService, PublicApiCacheProperties cacheProperties) {
        this.examCatalogService = examCatalogService;
        this.cacheProperties = cacheProperties;
    }

    @GetMapping
    public ResponseEntity<List<ExamCatalogService.ExamCatalogEntry>> listExams() {
        return PublicCacheResponses.catalogOk(
                examCatalogService.getCatalog(), examCatalogService.cacheVersion(), cacheProperties);
    }
}

package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.ExamCatalogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamCatalogService examCatalogService;

    public ExamController(ExamCatalogService examCatalogService) {
        this.examCatalogService = examCatalogService;
    }

    @GetMapping
    public List<ExamCatalogService.ExamCatalogEntry> listExams() {
        return examCatalogService.getCatalog();
    }
}

package com.neetlu.examhunt.service;

import org.springframework.stereotype.Service;

/** Bust in-process catalog caches after admin import or pack mutations. */
@Service
public class PublicCatalogCacheInvalidator {

    private final PackCatalogService packCatalogService;
    private final ExamCatalogService examCatalogService;

    public PublicCatalogCacheInvalidator(
            PackCatalogService packCatalogService, ExamCatalogService examCatalogService) {
        this.packCatalogService = packCatalogService;
        this.examCatalogService = examCatalogService;
    }

    public void invalidate() {
        packCatalogService.invalidateCache();
        examCatalogService.invalidateCache();
    }
}

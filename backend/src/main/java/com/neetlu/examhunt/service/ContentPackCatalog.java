package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.ContentPack;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** One installed row per logical pack_id (NEET_2016, etc.). */
public final class ContentPackCatalog {

    private ContentPackCatalog() {}

    public static List<ContentPack> dedupeByPackId(List<ContentPack> packs) {
        Map<String, ContentPack> best = new LinkedHashMap<>();
        for (ContentPack pack : packs) {
            String packId = pack.getPackId();
            if (packId == null || packId.isBlank()) {
                continue;
            }
            best.merge(packId, pack, ContentPackCatalog::preferCanonical);
        }
        return best.values().stream()
                .sorted(Comparator.comparingInt(ContentPack::getYear).reversed()
                        .thenComparing(ContentPack::getPackId, Comparator.nullsLast(String::compareTo)))
                .toList();
    }

    public static ContentPack preferCanonical(ContentPack a, ContentPack b) {
        Instant importedA = a.getImportedAt();
        Instant importedB = b.getImportedAt();
        if (importedA != null && importedB != null && !importedA.equals(importedB)) {
            return importedB.isAfter(importedA) ? b : a;
        }
        Instant publishedA = a.getPublishedAt();
        Instant publishedB = b.getPublishedAt();
        if (publishedA != null && publishedB != null && !publishedA.equals(publishedB)) {
            return publishedB.isAfter(publishedA) ? b : a;
        }
        String idA = a.getId() != null ? a.getId() : "";
        String idB = b.getId() != null ? b.getId() : "";
        return idB.compareTo(idA) > 0 ? b : a;
    }

    public static List<ContentPack> findDuplicateRows(List<ContentPack> packs, ContentPack keeper) {
        if (keeper.getPackId() == null || keeper.getPackId().isBlank()) {
            return List.of();
        }
        List<ContentPack> dupes = new ArrayList<>();
        for (ContentPack pack : packs) {
            if (!keeper.getPackId().equals(pack.getPackId())) {
                continue;
            }
            if (keeper.getId() != null && keeper.getId().equals(pack.getId())) {
                continue;
            }
            dupes.add(pack);
        }
        return dupes;
    }
}

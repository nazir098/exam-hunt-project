package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.ContentPack;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/** Denormalized PYQ / variant counts on {@link ContentPack#stats}. */
@Service
public class PackStatsService {

    public static final String KEY_PYQ_COUNT = "pyq_count";
    public static final String KEY_VARIANT_COUNT = "variant_count";
    public static final String KEY_TOTAL_COUNT = "total_count";

    private final ContentPackRepository packRepository;
    private final QuestionRepository questionRepository;

    public PackStatsService(ContentPackRepository packRepository, QuestionRepository questionRepository) {
        this.packRepository = packRepository;
        this.questionRepository = questionRepository;
    }

    public PackCounts recompute(String packId) {
        if (packId == null || packId.isBlank()) {
            return PackCounts.EMPTY;
        }
        long variants = questionRepository.countByPackIdAndSourceType(packId, "ai_variant");
        long total = questionRepository.countByPackId(packId);
        long pyq = Math.max(0, total - variants);
        PackCounts counts = new PackCounts(pyq, variants, total);

        packRepository.findByPackId(packId).ifPresent(pack -> {
            Map<String, Object> stats =
                    pack.getStats() != null ? new LinkedHashMap<>(pack.getStats()) : new LinkedHashMap<>();
            stats.put(KEY_PYQ_COUNT, pyq);
            stats.put(KEY_VARIANT_COUNT, variants);
            stats.put(KEY_TOTAL_COUNT, total);
            pack.setStats(stats);

            Map<String, Object> facets =
                    pack.getFacets() != null ? new LinkedHashMap<>(pack.getFacets()) : new LinkedHashMap<>();
            facets.put("variant_count", variants);
            pack.setFacets(facets);

            packRepository.save(pack);
        });

        return counts;
    }

    public long readPyqCount(ContentPack pack) {
        Long stored = readLong(pack.getStats(), KEY_PYQ_COUNT);
        if (stored != null) {
            return stored;
        }
        return liveCounts(pack.getPackId()).pyq();
    }

    public long readVariantCount(ContentPack pack) {
        Long stored = readLong(pack.getStats(), KEY_VARIANT_COUNT);
        if (stored != null) {
            return stored;
        }
        return liveCounts(pack.getPackId()).variants();
    }

    public long readTotalCount(ContentPack pack) {
        Long stored = readLong(pack.getStats(), KEY_TOTAL_COUNT);
        if (stored != null) {
            return stored;
        }
        Long pyq = readLong(pack.getStats(), KEY_PYQ_COUNT);
        Long variants = readLong(pack.getStats(), KEY_VARIANT_COUNT);
        if (pyq != null && variants != null) {
            return pyq + variants;
        }
        return liveCounts(pack.getPackId()).total();
    }

    private PackCounts liveCounts(String packId) {
        if (packId == null || packId.isBlank()) {
            return PackCounts.EMPTY;
        }
        long variants = questionRepository.countByPackIdAndSourceType(packId, "ai_variant");
        long total = questionRepository.countByPackId(packId);
        return new PackCounts(Math.max(0, total - variants), variants, total);
    }

    private static Long readLong(Map<String, Object> map, String key) {
        if (map == null || key == null) {
            return null;
        }
        Object value = map.get(key);
        if (value instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    public record PackCounts(long pyq, long variants, long total) {
        static final PackCounts EMPTY = new PackCounts(0, 0, 0);
    }
}

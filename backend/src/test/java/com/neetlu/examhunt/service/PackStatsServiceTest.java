package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.ContentPack;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PackStatsServiceTest {

    @Test
    void readPyqCountUsesStoredStatsWithoutRepositories() {
        PackStatsService service = new PackStatsService(null, null);
        ContentPack pack = new ContentPack();
        pack.setPackId("NEET_2025");
        pack.setStats(Map.of(PackStatsService.KEY_PYQ_COUNT, 180, PackStatsService.KEY_VARIANT_COUNT, 900));

        assertThat(service.readPyqCount(pack)).isEqualTo(180);
        assertThat(service.readVariantCount(pack)).isEqualTo(900);
        assertThat(service.readTotalCount(pack)).isEqualTo(1080);
    }

    @Test
    void readTotalCountDerivesFromPyqAndVariantWhenTotalMissing() {
        PackStatsService service = new PackStatsService(null, null);
        ContentPack pack = new ContentPack();
        pack.setStats(Map.of(PackStatsService.KEY_PYQ_COUNT, 180, PackStatsService.KEY_VARIANT_COUNT, 900));

        assertThat(service.readTotalCount(pack)).isEqualTo(1080);
    }
}

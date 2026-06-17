package com.neetlu.examhunt.web;

import com.neetlu.examhunt.config.PublicApiCacheProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PublicCacheResponsesTest {

    @Test
    void catalogOkSetsPublicCacheControlAndEtag() {
        PublicApiCacheProperties props = new PublicApiCacheProperties(60, 300, 60, 120);

        ResponseEntity<List<String>> response = PublicCacheResponses.catalogOk(List.of("NEET"), 42L, props);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).containsExactly("NEET");
        assertThat(response.getHeaders().getETag()).isEqualTo("\"catalog-42\"");
        String cacheHeader = response.getHeaders().getFirst("Cache-Control");
        assertThat(cacheHeader).isNotNull();
        assertThat(cacheHeader).contains("max-age=60");
        assertThat(cacheHeader).contains("s-maxage=300");
        assertThat(cacheHeader).contains("stale-while-revalidate=60");
        assertThat(cacheHeader).contains("public");
    }
}

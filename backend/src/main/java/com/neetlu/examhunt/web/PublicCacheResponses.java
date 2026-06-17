package com.neetlu.examhunt.web;

import com.neetlu.examhunt.config.PublicApiCacheProperties;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;

import java.util.concurrent.TimeUnit;

/** Cache-Control + ETag for public catalog responses cached at Cloudflare. */
public final class PublicCacheResponses {

    private PublicCacheResponses() {}

    public static <T> ResponseEntity<T> catalogOk(T body, long cacheVersion, PublicApiCacheProperties props) {
        String etag = "\"catalog-" + cacheVersion + "\"";
        CacheControl cacheControl =
                CacheControl.maxAge(props.maxAgeSeconds(), TimeUnit.SECONDS)
                        .cachePublic()
                        .sMaxAge(props.sMaxAgeSeconds(), TimeUnit.SECONDS)
                        .staleWhileRevalidate(props.staleWhileRevalidateSeconds(), TimeUnit.SECONDS);
        return ResponseEntity.ok().eTag(etag).cacheControl(cacheControl).body(body);
    }
}

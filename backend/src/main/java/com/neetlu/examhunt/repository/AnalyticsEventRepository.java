package com.neetlu.examhunt.repository;

import com.neetlu.examhunt.model.AnalyticsEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface AnalyticsEventRepository extends MongoRepository<AnalyticsEvent, String> {

    long countByCreatedAtAfter(Instant since);

    long countByNameAndCreatedAtAfter(String name, Instant since);

    List<AnalyticsEvent> findTop500ByCreatedAtAfterOrderByCreatedAtDesc(Instant since);
}

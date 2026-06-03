package com.neetlu.examhunt.service;

import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MockSeedService {

    private final ContentPackRepository packRepository;
    private final QuestionRepository questionRepository;

    public MockSeedService(ContentPackRepository packRepository, QuestionRepository questionRepository) {
        this.packRepository = packRepository;
        this.questionRepository = questionRepository;
    }

    /** @deprecated Use POST /api/admin/import/neet for real NEET data. */
    public SeedResult seedDemoPacks(boolean force) {
        return new SeedResult(0, 0, List.of(
                "Demo packs disabled — import real NEET data: POST /api/admin/import/neet"
        ));
    }

    public CleanupResult cleanupDemoPacks() {
        List<String> removed = new ArrayList<>();
        packRepository.findAll().stream()
                .filter(p -> p.getPackId().startsWith("DEMO_"))
                .forEach(p -> {
                    questionRepository.deleteByPackId(p.getPackId());
                    packRepository.deleteByPackId(p.getPackId());
                    removed.add(p.getPackId());
                });
        return new CleanupResult(removed.size(), removed);
    }

    public record SeedResult(int packsCreated, int questionsCreated, List<String> details) {}

    public record CleanupResult(int packsRemoved, List<String> packIds) {}
}

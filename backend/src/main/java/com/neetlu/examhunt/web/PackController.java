package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.ContentPack;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.repository.QuestionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/packs")
public class PackController {

    private final ContentPackRepository packRepository;
    private final QuestionRepository questionRepository;

    public PackController(ContentPackRepository packRepository, QuestionRepository questionRepository) {
        this.packRepository = packRepository;
        this.questionRepository = questionRepository;
    }

    @GetMapping
    public List<PackSummary> listPacks() {
        return packRepository.findAllByOrderByYearDesc().stream()
                .map(p -> new PackSummary(
                        p.getPackId(),
                        p.getExam(),
                        p.getYear(),
                        p.getSourceFolder(),
                        questionRepository.countByPackId(p.getPackId()),
                        p.getFacets()
                ))
                .toList();
    }

    @GetMapping("/{packId}")
    public PackDetail getPack(@PathVariable String packId) {
        ContentPack pack = packRepository.findByPackId(packId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found"));
        return new PackDetail(
                pack.getPackId(),
                pack.getExam(),
                pack.getYear(),
                pack.getSourceFolder(),
                pack.getStats(),
                pack.getFacets(),
                questionRepository.countByPackId(packId)
        );
    }

    @GetMapping("/{packId}/facets")
    public Map<String, Object> facets(@PathVariable String packId) {
        ContentPack pack = packRepository.findByPackId(packId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found"));
        return pack.getFacets() != null ? pack.getFacets() : Map.of();
    }

    public record PackSummary(
            String packId,
            String exam,
            int year,
            String sourceFolder,
            long questionCount,
            Map<String, Object> facets
    ) {}

    public record PackDetail(
            String packId,
            String exam,
            int year,
            String sourceFolder,
            Map<String, Object> stats,
            Map<String, Object> facets,
            long questionCount
    ) {}
}

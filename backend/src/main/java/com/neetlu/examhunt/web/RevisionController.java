package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.RevisionService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/revision")
public class RevisionController {

    private final RevisionService revisionService;

    public RevisionController(RevisionService revisionService) {
        this.revisionService = revisionService;
    }

    @GetMapping("/summary")
    public RevisionService.RevisionSummary summary(@AuthenticationPrincipal String userId) {
        return revisionService.summary(userId);
    }

    @GetMapping("/queue")
    public List<RevisionService.RevisionItemView> queue(
            @AuthenticationPrincipal String userId, @RequestParam(required = false) String status) {
        return revisionService.list(userId, status);
    }

    @PostMapping("/add")
    public RevisionService.RevisionItemView add(
            @AuthenticationPrincipal String userId, @RequestBody AddRevisionBody body) {
        return revisionService.add(
                userId, body.questionId(), body.source(), body.wrongAttemptId(), body.sessionId());
    }

    @PostMapping("/{questionId}/mark-revised")
    public RevisionService.RevisionItemView markRevised(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        return revisionService.markRevised(userId, questionId);
    }

    @PostMapping("/{questionId}/mark-pending")
    public RevisionService.RevisionItemView markPending(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        return revisionService.markPending(userId, questionId);
    }

    public record AddRevisionBody(String questionId, String source, String wrongAttemptId, String sessionId) {}
}

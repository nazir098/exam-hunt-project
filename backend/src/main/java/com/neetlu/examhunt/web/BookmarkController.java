package com.neetlu.examhunt.web;

import com.neetlu.examhunt.service.BookmarkService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @GetMapping
    public List<BookmarkService.BookmarkItemView> list(@AuthenticationPrincipal String userId) {
        return bookmarkService.list(userId);
    }

    @GetMapping("/batch-status")
    public Map<String, Boolean> batchStatus(
            @AuthenticationPrincipal String userId, @RequestParam("ids") String idsParam) {
        List<String> ids =
                idsParam == null || idsParam.isBlank()
                        ? List.of()
                        : Arrays.stream(idsParam.split(","))
                                .map(String::trim)
                                .filter(s -> !s.isEmpty())
                                .toList();
        return bookmarkService.batchStatus(userId, ids);
    }

    @GetMapping("/{questionId}/status")
    public BookmarkService.BookmarkStatus status(
            @AuthenticationPrincipal String userId, @PathVariable String questionId) {
        return bookmarkService.status(userId, questionId);
    }

    @PostMapping("/{questionId}/toggle")
    public BookmarkService.BookmarkView toggle(
            @AuthenticationPrincipal String userId,
            @PathVariable String questionId,
            @RequestBody(required = false) ToggleBody body) {
        String note = body == null ? null : body.note();
        return bookmarkService.toggle(userId, questionId, note);
    }

    public record ToggleBody(String note) {}
}

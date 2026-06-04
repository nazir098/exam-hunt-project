package com.neetlu.examhunt.web;

import com.neetlu.examhunt.security.AdminAuthorization;
import com.neetlu.examhunt.service.BookmarkService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/bookmarks")
public class AdminBookmarkController {

    private final BookmarkService bookmarkService;
    private final AdminAuthorization adminAuthorization;

    public AdminBookmarkController(BookmarkService bookmarkService, AdminAuthorization adminAuthorization) {
        this.bookmarkService = bookmarkService;
        this.adminAuthorization = adminAuthorization;
    }

    @PostMapping("/seed-sample")
    public ResponseEntity<?> seedSample(
            @RequestParam(defaultValue = "8") int limit,
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return ResponseEntity.ok(bookmarkService.seedSampleBookmarks(userId, limit));
    }

    @PostMapping("/clear-mine")
    public ResponseEntity<?> clearMine(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey) {
        adminAuthorization.requireAdminAccess(userId, adminKey);
        return ResponseEntity.ok(bookmarkService.clearUserBookmarks(userId));
    }
}

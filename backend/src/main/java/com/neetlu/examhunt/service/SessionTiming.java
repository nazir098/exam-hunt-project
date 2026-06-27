package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.PracticeSession;
import java.time.Instant;

/** Active-time limits for practice/test sessions (timer pauses when user leaves the session). */
final class SessionTiming {

    /** Auto-finish if the user stays away from the session longer than this. */
    static final long AWAY_IDLE_SECONDS = 30 * 60L;

    /** Cap total engaged time per session. */
    static final long MAX_ACTIVE_SECONDS = 2 * 60 * 60L;

    /** Cap wall-clock lifetime from first start. */
    static final long MAX_AGE_SECONDS = 24 * 60 * 60L;

    private SessionTiming() {}

    static int currentActiveSeconds(PracticeSession session, Instant now) {
        int base = Math.max(0, session.getActiveSeconds());
        Instant engaged = session.getEngagedSince();
        if (engaged == null) {
            return base;
        }
        long segment = Math.max(0, now.getEpochSecond() - engaged.getEpochSecond());
        return (int) Math.min(MAX_ACTIVE_SECONDS, base + segment);
    }

    static void flushEngagement(PracticeSession session, Instant now) {
        Instant engaged = session.getEngagedSince();
        if (engaged == null) {
            return;
        }
        long segment = Math.max(0, now.getEpochSecond() - engaged.getEpochSecond());
        int next = (int) Math.min(MAX_ACTIVE_SECONDS, session.getActiveSeconds() + segment);
        session.setActiveSeconds(next);
        session.setEngagedSince(null);
        session.setLastDisengagedAt(now);
    }

    static ExpiryReason expiryReason(PracticeSession session, Instant now) {
        if (!"active".equals(session.getStatus())) {
            return null;
        }
        if (session.getStartedAt() != null
                && now.getEpochSecond() - session.getStartedAt().getEpochSecond() > MAX_AGE_SECONDS) {
            return ExpiryReason.MAX_AGE;
        }
        if (currentActiveSeconds(session, now) >= MAX_ACTIVE_SECONDS) {
            return ExpiryReason.MAX_ACTIVE;
        }
        Instant lastAway = session.getLastDisengagedAt();
        if (session.getEngagedSince() == null
                && lastAway != null
                && now.getEpochSecond() - lastAway.getEpochSecond() > AWAY_IDLE_SECONDS) {
            return ExpiryReason.AWAY_IDLE;
        }
        return null;
    }

    enum ExpiryReason {
        AWAY_IDLE,
        MAX_ACTIVE,
        MAX_AGE
    }
}

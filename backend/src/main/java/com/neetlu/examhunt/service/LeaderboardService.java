package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.repository.UserAccountRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class LeaderboardService {

    private final MongoTemplate mongo;
    private final UserAccountRepository users;

    public LeaderboardService(MongoTemplate mongo, UserAccountRepository users) {
        this.mongo = mongo;
        this.users = users;
    }

    public LeaderboardResponse leaderboard(int limit, String period, String currentUserId) {
        int capped = Math.min(Math.max(limit, 1), 100);
        String normalizedPeriod = normalizePeriod(period);
        List<UserAggRow> ranked = aggregateRanked(periodStart(normalizedPeriod));
        Map<String, UserAccount> accounts = loadAccounts(ranked);

        List<LeaderboardEntry> all = new ArrayList<>();
        for (int i = 0; i < ranked.size(); i++) {
            UserAggRow row = ranked.get(i);
            boolean you = currentUserId != null && currentUserId.equals(row.getUserId());
            all.add(toEntry(i + 1, row, accounts.get(row.getUserId()), you));
        }

        List<LeaderboardEntry> top = all.stream().limit(capped).toList();
        LeaderboardEntry you = null;
        if (currentUserId != null) {
            you = all.stream().filter(e -> e.userId().equals(currentUserId)).findFirst().orElse(null);
        }

        return new LeaderboardResponse(normalizedPeriod, top, you, all.size());
    }

    private static String normalizePeriod(String period) {
        if (period == null || period.isBlank()) {
            return "all";
        }
        return switch (period.toLowerCase()) {
            case "weekly", "monthly", "all" -> period.toLowerCase();
            default -> "all";
        };
    }

    private static Instant periodStart(String period) {
        Instant now = Instant.now();
        return switch (period) {
            case "weekly" -> now.minus(7, ChronoUnit.DAYS);
            case "monthly" -> now.minus(30, ChronoUnit.DAYS);
            default -> null;
        };
    }

    private List<UserAggRow> aggregateRanked(Instant since) {
        List<AggregationOperation> ops = new ArrayList<>();
        if (since != null) {
            ops.add(Aggregation.match(Criteria.where("answeredAt").gte(since)));
        }
        ops.add(Aggregation.group("userId")
                .sum("marksAwarded")
                .as("totalMarks")
                .sum(ConditionalOperators.when("$correct").then(1).otherwise(0))
                .as("correct")
                .count()
                .as("attempts"));
        ops.add(Aggregation.sort(
                Sort.by(Sort.Direction.DESC, "totalMarks")
                        .and(Sort.by(Sort.Direction.DESC, "correct"))
                        .and(Sort.by(Sort.Direction.ASC, "attempts"))));
        return mongo.aggregate(Aggregation.newAggregation(ops), "question_attempts", UserAggRow.class)
                .getMappedResults();
    }

    private Map<String, UserAccount> loadAccounts(List<UserAggRow> ranked) {
        List<String> ids = ranked.stream().map(UserAggRow::getUserId).toList();
        Map<String, UserAccount> map = new HashMap<>();
        users.findAllById(ids).forEach(u -> map.put(u.getId(), u));
        return map;
    }

    private LeaderboardEntry toEntry(int rank, UserAggRow row, UserAccount account, boolean you) {
        long attempts = row.getAttempts();
        long correct = row.getCorrect();
        int accuracy = attempts > 0 ? (int) Math.round((correct * 100.0) / attempts) : 0;
        return new LeaderboardEntry(
                rank,
                row.getUserId(),
                displayName(account, row.getUserId()),
                row.getTotalMarks(),
                attempts,
                correct,
                accuracy,
                you);
    }

    private static String displayName(UserAccount account, String userId) {
        if (account != null && account.getDisplayName() != null && !account.getDisplayName().isBlank()) {
            return account.getDisplayName().trim();
        }
        if (account != null && account.getEmail() != null) {
            String local = account.getEmail().split("@")[0];
            if (!local.isBlank()) {
                return local.substring(0, 1).toUpperCase() + local.substring(1);
            }
        }
        String suffix = userId != null && userId.length() >= 4 ? userId.substring(userId.length() - 4) : "????";
        return "Scholar " + suffix;
    }

    public record LeaderboardEntry(
            int rank,
            String userId,
            String displayName,
            int totalMarks,
            long attempts,
            long correct,
            int accuracyPercent,
            boolean you) {}

    public record LeaderboardResponse(
            String period, List<LeaderboardEntry> entries, LeaderboardEntry you, int totalPlayers) {}

    static class UserAggRow {
        @Field("_id")
        private String userId;
        private int totalMarks;
        private long correct;
        private long attempts;

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public int getTotalMarks() {
            return totalMarks;
        }

        public void setTotalMarks(int totalMarks) {
            this.totalMarks = totalMarks;
        }

        public long getCorrect() {
            return correct;
        }

        public void setCorrect(long correct) {
            this.correct = correct;
        }

        public long getAttempts() {
            return attempts;
        }

        public void setAttempts(long attempts) {
            this.attempts = attempts;
        }
    }
}

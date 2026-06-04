package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.QuestionAttempt;
import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.repository.QuestionRepository;
import com.neetlu.examhunt.repository.UserAccountRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Duration;
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
    private final QuestionRepository questions;

    public LeaderboardService(
            MongoTemplate mongo, UserAccountRepository users, QuestionRepository questions) {
        this.mongo = mongo;
        this.users = users;
        this.questions = questions;
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

        PeriodTotals periodTotals = aggregatePeriodTotals(periodStart(normalizedPeriod));
        PeriodTotals allTimeTotals = aggregatePeriodTotals(null);
        long questionBankSize = questions.count();

        LeaderboardStats stats = new LeaderboardStats(
                periodTotals.scholars(),
                periodTotals.totalMarks(),
                periodTotals.attempts(),
                periodTotals.correct(),
                periodTotals.accuracyPercent(),
                allTimeTotals.scholars(),
                allTimeTotals.attempts(),
                questionBankSize,
                weeklyChallengeTarget(periodTotals.totalMarks()));

        List<ActivityItem> activity = recentActivity(periodStart(normalizedPeriod), 10, accounts);

        return new LeaderboardResponse(normalizedPeriod, top, you, all.size(), stats, activity);
    }

    private static int weeklyChallengeTarget(int currentMarks) {
        int floor = 250;
        int stretch = Math.max(floor, (int) Math.round(currentMarks * 1.35) + 50);
        return Math.min(stretch, 5000);
    }

    private PeriodTotals aggregatePeriodTotals(Instant since) {
        List<AggregationOperation> ops = new ArrayList<>();
        if (since != null) {
            ops.add(Aggregation.match(Criteria.where("answeredAt").gte(since)));
        }
        ops.add(Aggregation.group()
                .sum("marksAwarded")
                .as("totalMarks")
                .sum(ConditionalOperators.when("$correct").then(1).otherwise(0))
                .as("correct")
                .count()
                .as("attempts")
                .addToSet("userId")
                .as("userIds"));
        AggregationResults<PeriodAggRow> res =
                mongo.aggregate(Aggregation.newAggregation(ops), "question_attempts", PeriodAggRow.class);
        PeriodAggRow row = res.getUniqueMappedResult();
        if (row == null) {
            return new PeriodTotals(0, 0, 0, 0, 0);
        }
        int scholars = row.getUserIds() == null ? 0 : row.getUserIds().size();
        long attempts = row.getAttempts();
        long correct = row.getCorrect();
        int accuracy = attempts > 0 ? (int) Math.round((correct * 100.0) / attempts) : 0;
        return new PeriodTotals(scholars, row.getTotalMarks(), attempts, correct, accuracy);
    }

    private List<ActivityItem> recentActivity(Instant since, int limit, Map<String, UserAccount> knownAccounts) {
        Query q = new Query().with(Sort.by(Sort.Direction.DESC, "answeredAt")).limit(limit);
        if (since != null) {
            q.addCriteria(Criteria.where("answeredAt").gte(since));
        }
        List<QuestionAttempt> attempts = mongo.find(q, QuestionAttempt.class);
        if (attempts.isEmpty()) {
            return List.of();
        }
        List<String> missingIds = attempts.stream()
                .map(QuestionAttempt::getUserId)
                .filter(id -> !knownAccounts.containsKey(id))
                .distinct()
                .toList();
        Map<String, UserAccount> accounts = new HashMap<>(knownAccounts);
        if (!missingIds.isEmpty()) {
            users.findAllById(missingIds).forEach(u -> accounts.put(u.getId(), u));
        }
        List<ActivityItem> out = new ArrayList<>();
        for (QuestionAttempt a : attempts) {
            String name = displayName(accounts.get(a.getUserId()), a.getUserId());
            out.add(new ActivityItem(
                    name,
                    a.isCorrect(),
                    a.getMarksAwarded(),
                    formatRelative(a.getAnsweredAt())));
        }
        return out;
    }

    private static String formatRelative(Instant at) {
        if (at == null) {
            return "just now";
        }
        Duration d = Duration.between(at, Instant.now());
        long mins = d.toMinutes();
        if (mins < 1) {
            return "just now";
        }
        if (mins < 60) {
            return mins + "m ago";
        }
        long hours = d.toHours();
        if (hours < 24) {
            return hours + "h ago";
        }
        long days = d.toDays();
        if (days < 7) {
            return days + "d ago";
        }
        return days + "d ago";
    }

    private record PeriodTotals(int scholars, int totalMarks, long attempts, long correct, int accuracyPercent) {}

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

    public record LeaderboardStats(
            int scholarsInPeriod,
            int totalMarks,
            long totalAttempts,
            long totalCorrect,
            int avgAccuracyPercent,
            int allTimeScholars,
            long allTimeAttempts,
            long questionBankSize,
            int weeklyChallengeTarget) {}

    public record ActivityItem(String displayName, boolean correct, int marksAwarded, String relativeTime) {}

    public record LeaderboardResponse(
            String period,
            List<LeaderboardEntry> entries,
            LeaderboardEntry you,
            int totalPlayers,
            LeaderboardStats stats,
            List<ActivityItem> recentActivity) {}

    static class PeriodAggRow {
        private int totalMarks;
        private long correct;
        private long attempts;
        private List<String> userIds;

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

        public List<String> getUserIds() {
            return userIds;
        }

        public void setUserIds(List<String> userIds) {
            this.userIds = userIds;
        }
    }

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

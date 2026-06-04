package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.QuestionAttempt;
import com.neetlu.examhunt.model.UserAccount;
import com.neetlu.examhunt.repository.ContentPackRepository;
import com.neetlu.examhunt.repository.QuestionAttemptRepository;
import com.neetlu.examhunt.repository.UserAccountRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class LeaderboardDemoSeedService {

    static final String EMAIL_PREFIX = "lb-demo-";

    /** Valid BCrypt placeholder — demo accounts are not for login. */
    private static final String DEMO_PASSWORD_HASH =
            "$2a$10$8VfJ8VfJ8VfJ8VfJ8VfJ8OeInvalidDemoAccountHashPlaceholder000000000";

    private static final List<DemoPlayer> PLAYERS = List.of(
            new DemoPlayer("aarav", "Aarav Sharma", 156),
            new DemoPlayer("priya", "Priya Nair", 134),
            new DemoPlayer("rohan", "Rohan Mehta", 118),
            new DemoPlayer("ananya", "Ananya Iyer", 105),
            new DemoPlayer("vikram", "Vikram Singh", 89),
            new DemoPlayer("sneha", "Sneha Patel", 72),
            new DemoPlayer("karan", "Karan Dubey", 58),
            new DemoPlayer("meera", "Meera Joshi", 41),
            new DemoPlayer("arjun", "Arjun Reddy", 28),
            new DemoPlayer("diya", "Diya Kapoor", 12));

    private final UserAccountRepository users;
    private final QuestionAttemptRepository attempts;
    private final ContentPackRepository packs;

    public LeaderboardDemoSeedService(
            UserAccountRepository users,
            QuestionAttemptRepository attempts,
            ContentPackRepository packs) {
        this.users = users;
        this.attempts = attempts;
        this.packs = packs;
    }

    public boolean hasDemoData() {
        return users.findByEmailStartingWithIgnoreCase(EMAIL_PREFIX).stream()
                .anyMatch(u -> attempts.countByUserId(u.getId()) > 0);
    }

    public SeedResult seed(boolean force) {
        if (!force && hasDemoData()) {
            return new SeedResult(0, 0, List.of("Leaderboard demo already seeded"));
        }
        if (force) {
            cleanup();
        }
        String packId = packs.findAll().stream()
                .findFirst()
                .map(p -> p.getPackId())
                .orElse("NEET_2018");

        int usersCreated = 0;
        int attemptsCreated = 0;
        List<String> details = new ArrayList<>();

        for (DemoPlayer player : PLAYERS) {
            UserAccount user = getOrCreateUser(player);
            if (attempts.countByUserId(user.getId()) == 0) {
                usersCreated++;
            }
            int n = seedAttempts(user.getId(), packId, player.targetMarks());
            attemptsCreated += n;
            details.add(player.displayName() + ": " + player.targetMarks() + " marks (" + n + " attempts)");
        }

        return new SeedResult(usersCreated, attemptsCreated, details);
    }

    public CleanupResult cleanup() {
        List<UserAccount> demoUsers = users.findByEmailStartingWithIgnoreCase(EMAIL_PREFIX);
        int removedAttempts = 0;
        for (UserAccount user : demoUsers) {
            long count = attempts.countByUserId(user.getId());
            attempts.deleteByUserId(user.getId());
            removedAttempts += (int) count;
            users.delete(user);
        }
        return new CleanupResult(demoUsers.size(), removedAttempts);
    }

    private UserAccount getOrCreateUser(DemoPlayer player) {
        String email = EMAIL_PREFIX + player.slug() + "@examhunt.local";
        return users.findByEmailIgnoreCase(email).orElseGet(() -> {
            UserAccount user = new UserAccount();
            user.setEmail(email);
            user.setDisplayName(player.displayName());
            user.setPasswordHash(DEMO_PASSWORD_HASH);
            return users.save(user);
        });
    }

    private int seedAttempts(String userId, String packId, int targetMarks) {
        attempts.deleteByUserId(userId);

        int[] plan = planAttempts(targetMarks);
        int correct = plan[0];
        int wrong = plan[1];
        String sessionId = "lb-demo-session-" + userId;
        Instant base = Instant.now().minusSeconds(86400L * 7);
        int idx = 0;

        for (int c = 0; c < correct; c++) {
            saveAttempt(userId, packId, sessionId, idx++, true, base.plusSeconds(idx * 120L));
        }
        for (int w = 0; w < wrong; w++) {
            saveAttempt(userId, packId, sessionId, idx++, false, base.plusSeconds(idx * 120L));
        }
        return correct + wrong;
    }

    /** Returns [correctCount, wrongCount] with 4·c − w = targetMarks. */
    private static int[] planAttempts(int targetMarks) {
        for (int total = 8; total <= 80; total++) {
            if ((targetMarks + total) % 5 != 0) {
                continue;
            }
            int correct = (targetMarks + total) / 5;
            int wrong = total - correct;
            if (correct >= 0 && wrong >= 0 && correct <= total) {
                return new int[] {correct, wrong};
            }
        }
        int correct = Math.max(0, (targetMarks + 20) / 5);
        int wrong = Math.max(0, 20 - correct);
        return new int[] {correct, wrong};
    }

    private void saveAttempt(
            String userId, String packId, String sessionId, int index, boolean correct, Instant answeredAt) {
        QuestionAttempt attempt = new QuestionAttempt();
        attempt.setUserId(userId);
        attempt.setSessionId(sessionId);
        attempt.setQuestionId("lb-demo-q-" + userId + "-" + index);
        attempt.setPackId(packId);
        attempt.setSelectedAnswer(correct ? "1" : "2");
        attempt.setCorrect(correct);
        attempt.setMarksAwarded(correct ? 4 : -1);
        attempt.setAnsweredAt(answeredAt);
        attempts.save(attempt);
    }

    record DemoPlayer(String slug, String displayName, int targetMarks) {}

    public record SeedResult(int usersCreated, int attemptsCreated, List<String> details) {}

    public record CleanupResult(int usersRemoved, int attemptsRemoved) {}
}

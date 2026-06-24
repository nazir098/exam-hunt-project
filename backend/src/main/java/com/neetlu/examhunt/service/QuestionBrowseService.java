package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class QuestionBrowseService {

    private static final int MIN_FUZZY_RESULTS = 3;
    private static final int SCORE_THRESHOLD = 12;

    private final MongoTemplate mongo;

    public QuestionBrowseService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public Page<Question> browse(
            String packId,
            String subject,
            String chapter,
            String topic,
            String difficulty,
            String q,
            Integer questionNo,
            Pageable pageable
    ) {
        if (hasSearchIntent(q, questionNo)) {
            return browseRanked(packId, subject, chapter, topic, difficulty, q, questionNo, pageable);
        }
        return browseStrict(packId, subject, chapter, topic, difficulty, null, null, pageable);
    }

    private static boolean hasSearchIntent(String q, Integer questionNo) {
        return (q != null && !q.isBlank()) || (questionNo != null && questionNo > 0);
    }

    private Page<Question> browseStrict(
            String packId,
            String subject,
            String chapter,
            String topic,
            String difficulty,
            String q,
            Integer questionNo,
            Pageable pageable
    ) {
        List<Criteria> filters = basePackFilters(packId);
        if (subject != null && !subject.isBlank()) {
            filters.add(exactField("subject", subject));
        }
        if (chapter != null && !chapter.isBlank()) {
            filters.add(exactField("chapter", chapter));
        }
        if (topic != null && !topic.isBlank()) {
            filters.add(exactField("topic", topic));
        }
        if (difficulty != null && !difficulty.isBlank()) {
            filters.add(difficultyCriteria(difficulty));
        }
        if (questionNo != null && questionNo > 0) {
            filters.add(Criteria.where("questionNo").is(questionNo));
        }
        if (q != null && !q.isBlank()) {
            filters.add(tokenTextCriteria(q));
        }

        Criteria criteria = new Criteria().andOperator(filters.toArray(Criteria[]::new));
        Query query = Query.query(criteria).with(pageable);
        List<Question> content = mongo.find(query, Question.class);
        long total = mongo.count(Query.query(criteria), Question.class);
        return new PageImpl<>(content, pageable, total);
    }

    private Page<Question> browseRanked(
            String packId,
            String subject,
            String chapter,
            String topic,
            String difficulty,
            String q,
            Integer questionNo,
            Pageable pageable
    ) {
        List<Criteria> filters = basePackFilters(packId);
        if (difficulty != null && !difficulty.isBlank()) {
            filters.add(difficultyCriteria(difficulty));
        }
        Criteria criteria = new Criteria().andOperator(filters.toArray(Criteria[]::new));
        List<Question> candidates = mongo.find(Query.query(criteria), Question.class);

        List<ScoredQuestion> ranked = rankQuestions(
                candidates, q, questionNo, subject, chapter, topic, SCORE_THRESHOLD);
        if (ranked.isEmpty()) {
            ranked = rankQuestions(
                    candidates, q, questionNo, subject, chapter, topic, 1);
        }
        if (ranked.isEmpty() && hasSearchIntent(q, questionNo)) {
            ranked = rankQuestions(candidates, q, questionNo, subject, chapter, topic, 0)
                    .stream()
                    .limit(MIN_FUZZY_RESULTS)
                    .toList();
        }

        int total = ranked.size();
        int from = Math.toIntExact(pageable.getOffset());
        int to = Math.min(from + pageable.getPageSize(), total);
        List<Question> pageContent = from >= total
                ? List.of()
                : ranked.subList(from, to).stream().map(ScoredQuestion::question).toList();
        return new PageImpl<>(pageContent, pageable, total);
    }

    static List<ScoredQuestion> rankQuestions(
            List<Question> candidates,
            String rawQ,
            Integer questionNo,
            String filterSubject,
            String filterChapter,
            String filterTopic,
            int minScore
    ) {
        List<ScoredQuestion> scored = new ArrayList<>();
        for (Question question : candidates) {
            int score = scoreQuestion(question, rawQ, questionNo, filterSubject, filterChapter, filterTopic);
            if (score >= minScore) {
                scored.add(new ScoredQuestion(question, score));
            }
        }
        scored.sort(Comparator
                .comparingInt(ScoredQuestion::score).reversed()
                .thenComparingInt(s -> s.question().getQuestionNo()));
        return scored;
    }

    static int scoreQuestion(
            Question question,
            String rawQ,
            Integer questionNo,
            String filterSubject,
            String filterChapter,
            String filterTopic
    ) {
        int score = 0;

        if (filterSubject != null && !filterSubject.isBlank()
                && equalsIgnoreCase(question.getSubject(), filterSubject)) {
            score += 28;
        }
        if (filterChapter != null && !filterChapter.isBlank()
                && equalsIgnoreCase(question.getChapter(), filterChapter)) {
            score += 22;
        }
        if (filterTopic != null && !filterTopic.isBlank()
                && equalsIgnoreCase(question.getTopic(), filterTopic)) {
            score += 18;
        }

        if (questionNo != null && questionNo > 0) {
            int diff = Math.abs(question.getQuestionNo() - questionNo);
            if (diff == 0) {
                score += 320;
            } else if (diff <= 2) {
                score += 140 - diff * 25;
            } else if (diff <= 8) {
                score += 55 - diff * 4;
            }
        }

        String topic = lower(question.getTopic());
        String chapter = lower(question.getChapter());
        String subject = lower(question.getSubject());
        String subtopic = lower(question.getSubtopic());
        String preview = lower(question.getQuestionTextPreview());
        String full = rawQ == null ? "" : rawQ.trim().toLowerCase(Locale.ROOT);

        if (!full.isEmpty()) {
            if (topic.equals(full)) {
                score += 160;
            } else if (topic.contains(full)) {
                score += 95;
            } else if (chapter.contains(full)) {
                score += 75;
            } else if (subtopic.contains(full)) {
                score += 70;
            } else if (subject.contains(full)) {
                score += 60;
            } else if (preview.contains(full)) {
                score += 35;
            }

            List<String> tokens = tokenize(full);
            int tokenHits = 0;
            for (String token : tokens) {
                int tokenScore = scoreToken(topic, chapter, subject, subtopic, preview, token);
                if (tokenScore > 0) {
                    score += tokenScore;
                    tokenHits++;
                }
            }
            if (!tokens.isEmpty() && tokenHits == tokens.size()) {
                score += 45;
            } else if (!tokens.isEmpty() && tokenHits > 0) {
                score += tokenHits * 8;
            }
        }

        return score;
    }

    private static int scoreToken(
            String topic,
            String chapter,
            String subject,
            String subtopic,
            String preview,
            String token
    ) {
        if (token.length() < 2) {
            return 0;
        }
        if (containsToken(topic, token)) {
            return 58;
        }
        if (containsToken(chapter, token)) {
            return 48;
        }
        if (containsToken(subtopic, token)) {
            return 42;
        }
        if (containsToken(subject, token)) {
            return 36;
        }
        if (containsToken(preview, token)) {
            return 18;
        }
        if (fuzzyContains(topic, token) || fuzzyContains(chapter, token)) {
            return 24;
        }
        return 0;
    }

    private static boolean containsToken(String field, String token) {
        if (field == null || field.isBlank()) {
            return false;
        }
        if (field.contains(token)) {
            return true;
        }
        for (String word : field.split("\\s+")) {
            if (word.startsWith(token) || token.startsWith(word)) {
                return true;
            }
        }
        return false;
    }

    private static boolean fuzzyContains(String field, String token) {
        if (field == null || field.isBlank() || token.length() < 4) {
            return false;
        }
        for (String word : field.split("\\s+")) {
            if (word.length() < 4) {
                continue;
            }
            if (levenshtein(word, token) <= 1) {
                return true;
            }
        }
        return false;
    }

    private static List<String> tokenize(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String[] parts = raw.toLowerCase(Locale.ROOT).split("[^a-z0-9]+");
        List<String> tokens = new ArrayList<>();
        for (String part : parts) {
            if (part.length() >= 2) {
                tokens.add(part);
            }
        }
        return tokens;
    }

    private static Criteria tokenTextCriteria(String q) {
        List<String> tokens = tokenize(q);
        if (tokens.isEmpty()) {
            String pattern = Pattern.quote(q.trim());
            return new Criteria().orOperator(
                    Criteria.where("questionTextPreview").regex(pattern, "i"),
                    Criteria.where("subject").regex(pattern, "i"),
                    Criteria.where("chapter").regex(pattern, "i"),
                    Criteria.where("topic").regex(pattern, "i"),
                    Criteria.where("subtopic").regex(pattern, "i")
            );
        }
        List<Criteria> tokenCriteria = new ArrayList<>();
        for (String token : tokens) {
            String pattern = Pattern.quote(token);
            tokenCriteria.add(new Criteria().orOperator(
                    Criteria.where("questionTextPreview").regex(pattern, "i"),
                    Criteria.where("subject").regex(pattern, "i"),
                    Criteria.where("chapter").regex(pattern, "i"),
                    Criteria.where("topic").regex(pattern, "i"),
                    Criteria.where("subtopic").regex(pattern, "i")
            ));
        }
        return new Criteria().andOperator(tokenCriteria.toArray(Criteria[]::new));
    }

    private static List<Criteria> basePackFilters(String packId) {
        List<Criteria> filters = new ArrayList<>();
        filters.add(Criteria.where("packId").is(packId));
        filters.add(new Criteria().orOperator(
                Criteria.where("sourceType").exists(false),
                Criteria.where("sourceType").is("pyq"),
                Criteria.where("sourceType").isNull()
        ));
        return filters;
    }

    private static Criteria exactField(String field, String value) {
        return Criteria.where(field).regex("^" + Pattern.quote(value.trim()) + "$", "i");
    }

    private static Criteria difficultyCriteria(String difficulty) {
        String[] parts = difficulty.split(",");
        List<Criteria> ors = new ArrayList<>();
        for (String part : parts) {
            Criteria c = singleDifficultyCriteria(part.trim());
            if (c != null) {
                ors.add(c);
            }
        }
        if (ors.isEmpty()) {
            return Criteria.where("difficulty").gte(0);
        }
        if (ors.size() == 1) {
            return ors.get(0);
        }
        return new Criteria().orOperator(ors.toArray(Criteria[]::new));
    }

    private static Criteria singleDifficultyCriteria(String difficulty) {
        return switch (difficulty) {
            case "Easy", "easy" -> Criteria.where("difficulty").lte(1);
            case "Medium", "medium" -> Criteria.where("difficulty").is(2);
            case "Hard", "hard" -> Criteria.where("difficulty").gte(3);
            default -> null;
        };
    }

    private static boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right.trim());
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    static int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= b.length(); j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[a.length()][b.length()];
    }

    record ScoredQuestion(Question question, int score) {}
}

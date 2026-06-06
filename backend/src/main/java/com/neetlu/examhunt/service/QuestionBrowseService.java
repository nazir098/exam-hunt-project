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
import java.util.List;
import java.util.regex.Pattern;

@Service
public class QuestionBrowseService {

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
            Pageable pageable
    ) {
        List<Criteria> filters = new ArrayList<>();
        filters.add(Criteria.where("packId").is(packId));

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
        if (q != null && !q.isBlank()) {
            String pattern = Pattern.quote(q.trim());
            filters.add(new Criteria().orOperator(
                    Criteria.where("questionTextPreview").regex(pattern, "i"),
                    Criteria.where("subject").regex(pattern, "i"),
                    Criteria.where("chapter").regex(pattern, "i"),
                    Criteria.where("topic").regex(pattern, "i")
            ));
        }

        Criteria criteria = new Criteria().andOperator(filters.toArray(Criteria[]::new));
        Query query = Query.query(criteria).with(pageable);
        List<Question> content = mongo.find(query, Question.class);
        long total = mongo.count(Query.query(criteria), Question.class);
        return new PageImpl<>(content, pageable, total);
    }

    private static Criteria exactField(String field, String value) {
        return Criteria.where(field).regex("^" + Pattern.quote(value.trim()) + "$", "i");
    }

    private static Criteria difficultyCriteria(String difficulty) {
        return switch (difficulty.trim()) {
            case "Easy" -> Criteria.where("difficulty").lte(1);
            case "Medium" -> Criteria.where("difficulty").is(2);
            case "Hard" -> Criteria.where("difficulty").gte(3);
            default -> Criteria.where("difficulty").gte(0);
        };
    }
}

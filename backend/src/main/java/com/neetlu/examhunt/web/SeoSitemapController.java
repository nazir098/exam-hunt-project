package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.Question;
import com.neetlu.examhunt.service.SeoQuestionService;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * XML sitemap of text-indexable PYQ solve URLs for Google discovery.
 * Image-only questions are excluded so crawl budget focuses on readable text pages.
 */
@RestController
@RequestMapping("/api/seo")
public class SeoSitemapController {

    private static final String SITE_URL = "https://www.techmuzzle.in";
    private static final int MAX_URLS = 10_000;

    private final MongoTemplate mongoTemplate;

    public SeoSitemapController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping(value = "/sitemap", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        Query query = new Query()
                .addCriteria(indexableCriteria())
                .with(Sort.by(Sort.Direction.DESC, "year").and(Sort.by("questionNo")))
                .limit(MAX_URLS);

        query.fields().include("questionId");

        List<Question> questions = mongoTemplate.find(query, Question.class);
        String today = LocalDate.now().toString();

        StringBuilder xml = new StringBuilder(questions.size() * 220);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        for (Question q : questions) {
            String loc = SITE_URL + "/solve/" + q.getQuestionId();
            xml.append("  <url>\n");
            xml.append("    <loc>").append(escapeXml(loc)).append("</loc>\n");
            xml.append("    <lastmod>").append(today).append("</lastmod>\n");
            xml.append("    <changefreq>monthly</changefreq>\n");
            xml.append("    <priority>0.8</priority>\n");
            xml.append("  </url>\n");
        }

        xml.append("</urlset>\n");

        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=3600")
                .body(xml.toString());
    }

    static Criteria indexableCriteria() {
        Criteria pyqOnly = new Criteria()
                .orOperator(
                        Criteria.where("sourceType").is("pyq"),
                        Criteria.where("sourceType").exists(false),
                        Criteria.where("sourceType").is(""));

        Criteria textLayout = new Criteria()
                .orOperator(
                        Criteria.where("renderMode").in("structured", "hybrid"),
                        Criteria.where("contentTextNormalized").is(true));

        Criteria readableStem = new Criteria()
                .orOperator(
                        Criteria.where("questionTextPreview").exists(true).ne(""),
                        Criteria.where("options.0").exists(true));

        return new Criteria().andOperator(pyqOnly, textLayout, readableStem);
    }

    private static String escapeXml(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}

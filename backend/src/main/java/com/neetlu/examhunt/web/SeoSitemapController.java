package com.neetlu.examhunt.web;

import com.neetlu.examhunt.model.Question;
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
 * Generates an XML sitemap of all original PYQ question URLs
 * so Google can discover and index individual question pages.
 * Variants (ai_variant) are excluded — only canonical PYQs are listed.
 */
@RestController
@RequestMapping("/api/seo")
public class SeoSitemapController {

    private static final String SITE_URL = "https://www.techmuzzle.in";
    private static final int MAX_URLS = 5000;

    private final MongoTemplate mongoTemplate;

    public SeoSitemapController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping(value = "/sitemap", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        Query query = new Query()
                .addCriteria(new Criteria().orOperator(
                        Criteria.where("sourceType").is("pyq"),
                        Criteria.where("sourceType").exists(false)))
                .with(Sort.by("year").descending().and(Sort.by("questionNo")))
                .limit(MAX_URLS);

        // Only fetch the fields we need
        query.fields().include("questionId").include("exam").include("year")
                .include("subject").include("questionTextPreview");

        List<Question> questions = mongoTemplate.find(query, Question.class);
        String today = LocalDate.now().toString();

        StringBuilder xml = new StringBuilder(questions.size() * 200);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        for (Question q : questions) {
            String loc = SITE_URL + "/solve/" + q.getQuestionId();
            xml.append("  <url>\n");
            xml.append("    <loc>").append(escapeXml(loc)).append("</loc>\n");
            xml.append("    <lastmod>").append(today).append("</lastmod>\n");
            xml.append("    <changefreq>monthly</changefreq>\n");
            xml.append("    <priority>0.6</priority>\n");
            xml.append("  </url>\n");
        }

        xml.append("</urlset>\n");

        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=3600")
                .body(xml.toString());
    }

    private static String escapeXml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}

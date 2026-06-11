package com.neetlu.examhunt.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Document(collection = "questions")
@CompoundIndex(name = "pack_question_no", def = "{'packId': 1, 'questionNo': 1}")
@CompoundIndex(name = "pack_subject_chapter", def = "{'packId': 1, 'subject': 1, 'chapter': 1}")
public class Question {

    @Id
    private String id;

    @Indexed(unique = true)
    private String questionId;

    @Indexed
    private String packId;

    private int questionNo;
    private String exam;
    private int year;
    private String answer;
    private String subject;
    private String chapter;
    private String topic;
    private String subtopic;
    private int difficulty;
    private List<String> concepts;
    private boolean hasDiagram;
    private boolean hasEquation;
    private boolean hasSolution;
    private boolean answerOnly;
    private String questionImageUrl;
    private String solutionImageUrl;
    private String questionTextPreview;
    private String solutionTextPreview;
    /** Text MCQ options for AI variants (id 1–4 + option text). */
    private List<McqOption> options;
    private List<String> hints;
    private List<FormulaCard> formulaCards;
    private String conceptExplanation;
    private List<String> commonMistakes;
    private String practicePattern;
    /** Cached LLM revision notes for this PYQ (Explain after correct submit). */
    private String revisionNotes;
    /** Cached LLM wrong-answer explanations keyed by student option (1–4). */
    private Map<String, String> whyWrongByAnswer;
    /** pyq | ai_variant */
    private String sourceType = "pyq";
    /** Parent PYQ question_id for AI variants (e.g. NEET_2016_Q158). */
    private String parentQuestionId;
    /** 0 = original PYQ; 1–5 = AI variant number. */
    private int variantNo;
    private String variantType;
    /** mcq | assertion_reason | statement_based */
    private String questionFormat;
    private String assertion;
    private String reason;
    private List<McqOption> statements;
    /** Inline SVG from extractor diagrams/ (when no raster image). */
    private String questionDiagramSvg;
    private String solutionDiagramSvg;
    /** Field names admin edited — import/enrich/LLM must not overwrite these. */
    private Set<String> adminLockedFields;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public String getPackId() {
        return packId;
    }

    public void setPackId(String packId) {
        this.packId = packId;
    }

    public int getQuestionNo() {
        return questionNo;
    }

    public void setQuestionNo(int questionNo) {
        this.questionNo = questionNo;
    }

    public String getExam() {
        return exam;
    }

    public void setExam(String exam) {
        this.exam = exam;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getChapter() {
        return chapter;
    }

    public void setChapter(String chapter) {
        this.chapter = chapter;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getSubtopic() {
        return subtopic;
    }

    public void setSubtopic(String subtopic) {
        this.subtopic = subtopic;
    }

    public int getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(int difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getConcepts() {
        return concepts;
    }

    public void setConcepts(List<String> concepts) {
        this.concepts = concepts;
    }

    public boolean isHasDiagram() {
        return hasDiagram;
    }

    public void setHasDiagram(boolean hasDiagram) {
        this.hasDiagram = hasDiagram;
    }

    public boolean isHasEquation() {
        return hasEquation;
    }

    public void setHasEquation(boolean hasEquation) {
        this.hasEquation = hasEquation;
    }

    public boolean isHasSolution() {
        return hasSolution;
    }

    public void setHasSolution(boolean hasSolution) {
        this.hasSolution = hasSolution;
    }

    public boolean isAnswerOnly() {
        return answerOnly;
    }

    public void setAnswerOnly(boolean answerOnly) {
        this.answerOnly = answerOnly;
    }

    public String getQuestionImageUrl() {
        return questionImageUrl;
    }

    public void setQuestionImageUrl(String questionImageUrl) {
        this.questionImageUrl = questionImageUrl;
    }

    public String getSolutionImageUrl() {
        return solutionImageUrl;
    }

    public void setSolutionImageUrl(String solutionImageUrl) {
        this.solutionImageUrl = solutionImageUrl;
    }

    public String getQuestionTextPreview() {
        return questionTextPreview;
    }

    public void setQuestionTextPreview(String questionTextPreview) {
        this.questionTextPreview = questionTextPreview;
    }

    public String getSolutionTextPreview() {
        return solutionTextPreview;
    }

    public void setSolutionTextPreview(String solutionTextPreview) {
        this.solutionTextPreview = solutionTextPreview;
    }

    public List<McqOption> getOptions() {
        return options;
    }

    public void setOptions(List<McqOption> options) {
        this.options = options;
    }

    public List<String> getHints() {
        return hints;
    }

    public void setHints(List<String> hints) {
        this.hints = hints;
    }

    public List<FormulaCard> getFormulaCards() {
        return formulaCards;
    }

    public void setFormulaCards(List<FormulaCard> formulaCards) {
        this.formulaCards = formulaCards;
    }

    public String getConceptExplanation() {
        return conceptExplanation;
    }

    public void setConceptExplanation(String conceptExplanation) {
        this.conceptExplanation = conceptExplanation;
    }

    public List<String> getCommonMistakes() {
        return commonMistakes;
    }

    public void setCommonMistakes(List<String> commonMistakes) {
        this.commonMistakes = commonMistakes;
    }

    public String getPracticePattern() {
        return practicePattern;
    }

    public void setPracticePattern(String practicePattern) {
        this.practicePattern = practicePattern;
    }

    public String getRevisionNotes() {
        return revisionNotes;
    }

    public void setRevisionNotes(String revisionNotes) {
        this.revisionNotes = revisionNotes;
    }

    public Map<String, String> getWhyWrongByAnswer() {
        return whyWrongByAnswer;
    }

    public void setWhyWrongByAnswer(Map<String, String> whyWrongByAnswer) {
        this.whyWrongByAnswer = whyWrongByAnswer;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getParentQuestionId() {
        return parentQuestionId;
    }

    public void setParentQuestionId(String parentQuestionId) {
        this.parentQuestionId = parentQuestionId;
    }

    public int getVariantNo() {
        return variantNo;
    }

    public void setVariantNo(int variantNo) {
        this.variantNo = variantNo;
    }

    public String getVariantType() {
        return variantType;
    }

    public void setVariantType(String variantType) {
        this.variantType = variantType;
    }

    public String getQuestionFormat() {
        return questionFormat;
    }

    public void setQuestionFormat(String questionFormat) {
        this.questionFormat = questionFormat;
    }

    public String getAssertion() {
        return assertion;
    }

    public void setAssertion(String assertion) {
        this.assertion = assertion;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public List<McqOption> getStatements() {
        return statements;
    }

    public void setStatements(List<McqOption> statements) {
        this.statements = statements;
    }

    public String getQuestionDiagramSvg() {
        return questionDiagramSvg;
    }

    public void setQuestionDiagramSvg(String questionDiagramSvg) {
        this.questionDiagramSvg = questionDiagramSvg;
    }

    public String getSolutionDiagramSvg() {
        return solutionDiagramSvg;
    }

    public void setSolutionDiagramSvg(String solutionDiagramSvg) {
        this.solutionDiagramSvg = solutionDiagramSvg;
    }

    public Set<String> getAdminLockedFields() {
        return adminLockedFields;
    }

    public void setAdminLockedFields(Set<String> adminLockedFields) {
        this.adminLockedFields = adminLockedFields;
    }
}

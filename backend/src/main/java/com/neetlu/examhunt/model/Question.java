package com.neetlu.examhunt.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

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
    private List<String> hints;
    private List<FormulaCard> formulaCards;
    private String conceptExplanation;
    private List<String> commonMistakes;
    private String practicePattern;

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
}

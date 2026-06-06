package com.neetlu.examhunt.service;

import org.springframework.stereotype.Service;

@Service
public class AnswerValidationService {

    public boolean isCorrect(String storedAnswer, String selectedAnswer) {
        if (storedAnswer == null || selectedAnswer == null) {
            return false;
        }
        String expected = normalize(storedAnswer);
        String chosen = normalize(selectedAnswer);
        return !expected.isEmpty() && expected.equals(chosen);
    }

    public int marksForAttempt(boolean correct) {
        return correct ? 4 : -1;
    }

    public String normalize(String answer) {
        if (answer == null) {
            return "";
        }
        String s = answer.trim().toUpperCase();
        return switch (s) {
            case "A", "1" -> "1";
            case "B", "2" -> "2";
            case "C", "3" -> "3";
            case "D", "4" -> "4";
            default -> s.replaceAll("[^1-4A-D]", "");
        };
    }
}

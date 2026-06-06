package com.neetlu.examhunt.service;

import com.neetlu.examhunt.model.Question;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Heuristic gate: skip Formula AI when a PYQ is concept-only (saves LLM tokens). */
public final class FormulaEligibility {

    private static final Pattern MATH_SIGNAL = Pattern.compile(
            "(?i)(\\d+\\s*(m/s|ms-?1|nm|mol|k?j|w|pa|atm|°c|kelvin|k\\)|×\\s*10|\\^)|"
                    + "=|√|∝|\\\\sqrt|v_\\{rms\\}|r\\.?m\\.?s|calculate|find the (value|ratio)|"
                    + "ratio of|value of|efficiency|concentration|ph\\b|pka|rate constant|"
                    + "equilibrium constant|half-?life|binding energy|de broglie)");

    private static final String[] FORMULA_TOPIC_HINTS = {
        "velocity", "acceleration", "force", "energy", "momentum", "capacit",
        "resistance", "current", "voltage", "wave", "frequency", "optics", "lens",
        "kinetic", "thermodynamic", "gas", "equilibrium", "mole", "stoichiometr",
        "enthalpy", "electro", "magnetic", "field", "rms", "photon", "decay",
        "dimension", "unit of", "ohm", "faraday", "nernst", "hardy", "weinberg"
    };

    private static final String[] CONCEPT_ONLY_HINTS = {
        "which of the following",
        "correct statement",
        "incorrect statement",
        "true regarding",
        "false regarding",
        "match the following",
        "match list",
        "identify the wrong",
        "identify the correct",
        "function of the",
        "structure of the",
        "name the",
        "select the wrong",
        "select the correct"
    };

    private FormulaEligibility() {}

    public static boolean questionNeedsFormula(Question q) {
        if (q == null) {
            return false;
        }
        String subject = nullToEmpty(q.getSubject()).toLowerCase(Locale.ROOT);
        String blob = contextBlob(q);

        if (isBiologySubject(subject)) {
            return q.isHasEquation() && hasMathSignals(blob);
        }

        if (q.isHasEquation()) {
            return true;
        }

        if (isConceptOnly(blob) && !hasMathSignals(blob)) {
            return false;
        }

        if (subject.contains("physics") || subject.contains("chemistry")) {
            return hasFormulaTopicHints(blob) || hasMathSignals(blob);
        }

        return hasMathSignals(blob);
    }

    private static boolean isBiologySubject(String subject) {
        return subject.contains("biology")
                || subject.contains("botany")
                || subject.contains("zoology");
    }

    private static boolean isConceptOnly(String blob) {
        for (String hint : CONCEPT_ONLY_HINTS) {
            if (blob.contains(hint)) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasFormulaTopicHints(String blob) {
        for (String hint : FORMULA_TOPIC_HINTS) {
            if (blob.contains(hint)) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasMathSignals(String blob) {
        return MATH_SIGNAL.matcher(blob).find();
    }

    private static String contextBlob(Question q) {
        StringBuilder sb = new StringBuilder();
        append(sb, q.getChapter());
        append(sb, q.getTopic());
        append(sb, q.getSubtopic());
        append(sb, q.getQuestionTextPreview());
        List<String> concepts = q.getConcepts();
        if (concepts != null) {
            for (String c : concepts) {
                append(sb, c);
            }
        }
        return sb.toString().toLowerCase(Locale.ROOT);
    }

    private static void append(StringBuilder sb, String part) {
        if (part != null && !part.isBlank()) {
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(part.strip());
        }
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}

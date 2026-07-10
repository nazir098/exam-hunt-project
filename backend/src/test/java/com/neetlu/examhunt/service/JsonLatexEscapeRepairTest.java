package com.neetlu.examhunt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class JsonLatexEscapeRepairTest {

    @ParameterizedTest
    @MethodSource("corruptionCases")
    void repairsJsonUnescapeCorruption(String broken, String expected) {
        assertEquals(expected, JsonLatexEscapeRepair.repairAfterJsonUnescape(broken));
    }

    private static Stream<Arguments> corruptionCases() {
        return Stream.of(
                Arguments.of("\u000crac{a}{b}", "\\frac{a}{b}"),
                Arguments.of("\u0008eta", "\\beta"),
                Arguments.of("\t" + "heta", "\\theta"),
                Arguments.of("\n" + "eq", "\\neq"));
    }

    @Test
    void relaxJsonFixesMathrm() {
        String broken = "{\"fixed_text\":\"$\\mathrm{A}$\"}";
        String relaxed = JsonLatexEscapeRepair.relaxJsonLatexEscapes(broken);
        assertTrue(relaxed.contains("\\\\mathrm"));
    }

    @Test
    void mathRepairCoreDelegatesCorruptionFixes() {
        String broken = "\u0008eta";
        assertTrue(MathRepairCore.repairJsonEscapedLatex(broken).contains("\\beta"));
        assertEquals(JsonLatexEscapeRepair.applyCorruptionFixes(broken), "\\beta");
    }
}

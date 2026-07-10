package com.neetlu.examhunt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class AiTextNormalizerTest {

    @Test
    void repairsLeftRightDollarDelimitersInVariantOptions() {
        String broken = "g_h=g\\left$$\\frac{R}{R+h}\\right)$$^2";
        String fixed = AiTextNormalizer.normalizeMathContent(broken);
        assertEquals("g_h=g\\left(\\frac{R}{R+h}\\right)^2", fixed);
    }

    @Test
    void splitsInlineSolutionStepHeaders() {
        String broken = "**Step 1**\n\nExact curvature is $x$. **Step 2**\n\nFor small slopes.";
        String fixed = AiTextNormalizer.sanitizeEnrichmentText(broken);
        assertTrue(fixed.contains("### Step 1"));
        assertTrue(fixed.contains("### Step 2"));
        assertFalse(fixed.contains("**Step 2**"));
        assertTrue(fixed.indexOf("### Step 2") > fixed.indexOf("$x$"));
    }

    @Test
    void preservesParentheticalMathInsideStemDelimiters() {
        String stem =
                "angle $\\theta_0 (\\theta_0 << 1)$ with the $x$ -axis at $x = L$ . If $y(x)$ is the height";
        String fixed = AiTextNormalizer.sanitizeQuestionStemText(stem);
        assertTrue(fixed.contains("$\\theta_0 (\\theta_0 << 1)$"));
        assertFalse(fixed.contains("$\\theta_0$\\theta_0"));
        assertTrue(fixed.contains("with the $x$"));
    }

    @Test
    void wrapsBarePhysicsOptionLatexAndRepairsLeftDelimiters() {
        String broken = "B_{y} = 2 \\times 10^{-7} \\cos\\left$$5x + 1.5 \\times 10^{9} t \\right)$$T";
        String fixed = AiTextNormalizer.sanitizeMcqOptionText(broken);
        assertTrue(fixed.startsWith("$"));
        assertTrue(fixed.endsWith("$"));
        assertTrue(fixed.contains("\\cos\\left("));
        assertFalse(fixed.contains("\\left$$"));
    }

    @Test
    void trimsEmbeddedNumericOptionsFromStem() {
        String stem =
                "Then expression for the magnetic field is :\n"
                        + "(1) B_{y} = 2\\times 10^{-7} T (2) B_{x} = 2\\times 10^{-7} T "
                        + "(3) B_{z} = 60 T (4) B_{y} = 60 T";
        String fixed = AiTextNormalizer.sanitizeQuestionStemText(stem);
        assertEquals("Then expression for the magnetic field is :", fixed);
    }

    @Test
    void repairsLlmCosDoubleDollarOptionWrappers() {
        String broken = "B_y=2\\times10^{-7}\\cos$$5x+1.5\\times10^9t$$\\,\\text{T}";
        String fixed = AiTextNormalizer.sanitizeMcqOptionText(broken);
        assertTrue(fixed.startsWith("$"));
        assertTrue(fixed.contains("\\cos(5x"));
        assertFalse(fixed.contains("$$"));
        assertTrue(fixed.contains("B_{y}"));
    }

    @Test
    void preservesProseSpacesWhenStemContainsInlineMuK() {
        String stem =
                "There are two inclined surfaces of equal length (L) and same angle of inclination 45°"
                        + " with the horizontal. The coefficient of kinetic friction (\\mu_k) between"
                        + " the object and the rough surface is close to (1)0.25 (2)0.40 (3)0.5 (4)0.75";
        String fixed = AiTextNormalizer.sanitizeQuestionStemText(stem);
        assertTrue(fixed.contains("There are two inclined surfaces"));
        assertFalse(fixed.startsWith("$There"));
        assertTrue(fixed.contains("$\\mu_k$") || fixed.contains("(\\mu_k)"));
        assertFalse(fixed.contains("(1)0.25"));
    }

    @Test
    void repairsBrokenSolutionDelimiters() {
        String broken =
                "$t_{\\text{rough}} = 2t_{\\text{smooth}}$\n"
                        + "$$t \\propto \\frac{1}{\\sqrt{a}}\\quad\\Rightarrow\\quad t_{\\mathrm{smooth}}"
                        + " \\propto \\frac{1}{\\sqrt{g\\sin\\theta}}\n"
                        + "$a_{\\text{rough}} = g \\sin \\theta - \\mu_k g \\cos \\theta$"
                        + " \\frac{t_{\\mathrm{rough}}}{t_{\\mathrm{smooth}}} = 4\n"
                        + "1-\\mu_k=\\frac{1}{4}$$$$\\mu_k=\\frac{3}{4}=0.75$";
        String fixed = AiTextNormalizer.sanitizeSolutionText(broken);
        assertTrue(fixed.contains("$t_{\\text{rough}} = 2t_{\\text{smooth}}$"));
        assertFalse(fixed.contains("$$$$"));
        assertTrue(fixed.contains("\\mu_k"));
        assertTrue(fixed.contains("0.75"));
    }

    @Test
    void wrapsMultilineArrayEnvironmentInDisplayMath() {
        String broken =
                "By work-energy theorem,\n"
                        + "\\begin{array}{rl}\n"
                        + "&F S=\\Delta K \\\\\n"
                        + "\\Rightarrow&-F S=k_{f}-k_{i} \\\\\n"
                        + "\\end{array}";
        String fixed = AiTextNormalizer.sanitizeSolutionText(broken);
        assertTrue(fixed.contains("By work-energy theorem,"), () -> fixed);
        assertTrue(fixed.contains("$$"), () -> fixed);
        assertTrue(fixed.contains("\\begin{array}{rl}"), () -> fixed);
        assertTrue(fixed.contains("end{array}"), () -> fixed);
    }

    @Test
    void stripsInlineDollarDelimitersAroundArrayEnvironment() {
        String broken =
                "By work-energy theorem,\n"
                        + "$\\begin{array}{rl}\n"
                        + "&F S=\\Delta K \\cdot E \\\\\n"
                        + "\\implies &-F S=k_{f}-k_{i} \\\\\n"
                        + "& = \\frac{150}{225} = \\frac{2}{3}\n"
                        + "\\end{array}$";
        String fixed = AiTextNormalizer.sanitizeSolutionText(broken);
        assertTrue(fixed.contains("By work-energy theorem,"), () -> fixed);
        assertTrue(fixed.contains("$$"), () -> fixed);
        assertTrue(fixed.contains("\\begin{array}{rl}"), () -> fixed);
        assertFalse(fixed.contains("$\\begin{array}{rl}"), () -> fixed);
    }

    @Test
    void wrapsArrayLColumnEnvironmentInDisplayMath() {
        String broken =
                "Impulse,\n"
                        + "\\begin{array}{l}\n"
                        + " = \\frac{1}{2} (14 - (- 28)) \\\\\n"
                        + " = 21 \\text{NS}\n"
                        + "\\end{array}";
        String fixed = AiTextNormalizer.sanitizeSolutionText(broken);
        assertTrue(fixed.contains("$$"), () -> fixed);
        assertTrue(fixed.contains("\\begin{array}{l}"), () -> fixed);
        assertFalse(fixed.contains("\\begin{array{l}"), () -> fixed);
        assertTrue(fixed.contains("21"), () -> fixed);
    }

    @Test
    void repairsPreviouslyCorruptArrayOpener() {
        String broken =
                "$$\n\\begin{array{l}\n = \\frac{1}{2} (14 - (- 28)) \\\\\n = 21 \\text{NS}\n\\end{array}\n$$";
        String fixed = AiTextNormalizer.sanitizeSolutionText(broken);
        assertTrue(fixed.contains("\\begin{array}{l}"), () -> fixed);
        assertFalse(fixed.contains("\\begin{array{l}"), () -> fixed);
    }

    @Test
    void wrapsAlignedEnvironmentInDisplayMath() {
        String broken =
                """
                $Y_1 = \\overline{A+B}$
                $Y_2 = \\overline{A \\cdot B}$

                \\begin{aligned}
                Y &= Y_1 \\cdot Y_2 \\\\
                &= \\overline{A+B}
                \\end{aligned}
                """;
        String fixed = AiTextNormalizer.sanitizeSolutionText(broken);
        assertTrue(fixed.contains("$$"), () -> fixed);
        assertTrue(fixed.contains("begin{aligned}"), () -> fixed);
        assertTrue(AiTextNormalizer.looksLikeCorruptSolution(broken));
    }
}

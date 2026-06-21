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
}

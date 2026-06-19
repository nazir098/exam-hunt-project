package com.neetlu.examhunt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AiTextNormalizerTest {

    @Test
    void repairsLeftRightDollarDelimitersInVariantOptions() {
        String broken = "g_h=g\\left$$\\frac{R}{R+h}\\right)$$^2";
        String fixed = AiTextNormalizer.normalizeMathContent(broken);
        assertEquals("g_h=g\\left(\\frac{R}{R+h}\\right)^2", fixed);
    }
}

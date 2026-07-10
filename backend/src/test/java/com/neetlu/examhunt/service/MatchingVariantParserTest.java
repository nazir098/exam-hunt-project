package com.neetlu.examhunt.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neetlu.examhunt.model.McqOption;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchingVariantParserTest {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void parsesListAFromQuestionTextAndListBFromDiagramParams() throws Exception {
    String json =
        """
        {
          "question_id": "AI_TEST_Q141_V1",
          "variant_type": "matching",
          "question_text": "Match List-I with List-II: A. Scutellum B. Non-albuminous seed C. Epiblast D. Perisperm.",
          "answer": "1",
          "options": [{"id":"1","text":"A-cotyledon, B-groundnut, C-rudimentary, D-persistent"}],
          "question_diagram": {
            "diagram_params": {
              "scutellum": "cotyledon of monocot seed",
              "non_albuminous_seed": "groundnut",
              "epiblast": "rudimentary cotyledon",
              "perisperm": "persistent nucellus"
            }
          }
        }
        """;
    var node = mapper.readTree(json);
    assertTrue(MatchingVariantParser.isMatchingVariant(node));
    MatchingVariantParser.ParsedMatching parsed = MatchingVariantParser.parse(node);
    assertEquals("Match List-I with List-II", parsed.intro());
    assertEquals(4, parsed.listA().size());
    assertEquals("A", parsed.listA().get(0).getId());
    assertEquals("Scutellum", parsed.listA().get(0).getText());
    assertEquals(4, parsed.listB().size());
    List<String> listBTexts = parsed.listB().stream().map(McqOption::getText).toList();
    assertTrue(listBTexts.contains("cotyledon of monocot seed"));
    assertTrue(listBTexts.contains("groundnut"));
  }

  @Test
  void parsesNeet2025Q162MatchingVariant() throws Exception {
    String json =
        """
        {
          "question_id": "AI_NEET_2025_Q162_V1",
          "variant_type": "matching",
          "question_text": "Match the plant group with its example: A. Pteridophyte B. Bryophyte C. Angiosperm D. Gymnosperm.",
          "answer": "1",
          "options": [
            {"id":"1","text":"A-Salvinia, B-Polytrichum, C-Salvia, D-Ginkgo"},
            {"id":"2","text":"A-Polytrichum, B-Salvinia, C-Ginkgo, D-Salvia"},
            {"id":"3","text":"A-Ginkgo, B-Salvia, C-Polytrichum, D-Salvinia"},
            {"id":"4","text":"A-Salvia, B-Ginkgo, C-Salvinia, D-Polytrichum"}
          ],
          "question_diagram": {
            "diagram_params": {
              "pteridophyte": "Salvinia",
              "bryophyte": "Polytrichum",
              "angiosperm": "Salvia",
              "gymnosperm": "Ginkgo"
            }
          }
        }
        """;
    var node = mapper.readTree(json);
    MatchingVariantParser.ParsedMatching parsed = MatchingVariantParser.parse(node);
    assertEquals("Match the plant group with its example", parsed.intro());
    assertEquals(4, parsed.listA().size());
    assertEquals("A", parsed.listA().get(0).getId());
    assertEquals("Pteridophyte", parsed.listA().get(0).getText());
    assertEquals(4, parsed.listB().size());
    List<String> listBTexts = parsed.listB().stream().map(McqOption::getText).toList();
    assertTrue(listBTexts.contains("Salvinia"));
    assertTrue(listBTexts.contains("Polytrichum"));
    assertTrue(listBTexts.contains("Salvia"));
    assertTrue(listBTexts.contains("Ginkgo"));
    assertNotEquals("Salvinia", listBTexts.get(0), "List-II should be shuffled, not the diagram key order");
    assertEquals(
            listBTexts,
            MatchingVariantParser.parse(node).listB().stream().map(McqOption::getText).toList(),
            "shuffle should be stable for the same question id");
  }

  @Test
  void parsesMineruMatchingTableFromQuestionStem() throws Exception {
    String json =
        """
        {
          "question_id": "NEET_2025_Q101",
          "question_format": "matching",
          "question_stem": "Match List-I with List-II.\\n| | List-I | | List-II |\\n| --- | --- | --- | --- |\\n| A. | Emphysema | I. | Rapid spasms in muscle due to low Ca++ in body fluid |\\n| B. | Angina Pectoris | II. | Damaged alveolar walls and decreased respiratory surface |\\n| C. | Glomerulonephritis | III. | Acute chest pain when not enough oxygen is reaching to heart muscle |\\n| D. | Tetany | IV. | Inflammation of glomeruli of kidney |",
          "question_text": "garbage ocr text"
        }
        """;
    var node = mapper.readTree(json);
    MatchingVariantParser.ParsedMatching parsed = MatchingVariantParser.parse(node);
    assertEquals("Match List-I with List-II", parsed.intro());
    assertEquals(4, parsed.listA().size());
    assertEquals("Emphysema", parsed.listA().get(0).getText());
    assertEquals("Angina Pectoris", parsed.listA().get(1).getText());
    assertEquals(4, parsed.listB().size());
    assertEquals("I", parsed.listB().get(0).getId());
    assertEquals(
            "Rapid spasms in muscle due to low Ca++ in body fluid",
            parsed.listB().get(0).getText());
    assertTrue(MatchingVariantParser.listsLookCorrupt(
            List.of(
                    option("A", "I. Rapid spasms in muscle due to low Ca++ in body fluid Emphysema")),
            List.of(option("1", "I"))));
  }

  private static McqOption option(String id, String text) {
    McqOption o = new McqOption();
    o.setId(id);
    o.setText(text);
    return o;
  }
}

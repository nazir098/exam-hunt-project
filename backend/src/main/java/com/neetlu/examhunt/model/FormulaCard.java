package com.neetlu.examhunt.model;

/** Pre-baked formula card from pdf-qa-extractor enrichment / published manifest. */
public class FormulaCard {

    private String name;
    private String formula;
    private String description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFormula() {
        return formula;
    }

    public void setFormula(String formula) {
        this.formula = formula;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}

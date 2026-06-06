---
name: Lumina Prep
colors:
  surface: '#111125'
  surface-dim: '#111125'
  surface-bright: '#37374d'
  surface-container-lowest: '#0c0c1f'
  surface-container-low: '#1a1a2e'
  surface-container: '#1e1e32'
  surface-container-high: '#28283d'
  surface-container-highest: '#333348'
  on-surface: '#e2e0fc'
  on-surface-variant: '#cfc2d7'
  inverse-surface: '#e2e0fc'
  inverse-on-surface: '#2f2e43'
  outline: '#988ca0'
  outline-variant: '#4c4354'
  surface-tint: '#dcb8ff'
  primary: '#dcb8ff'
  on-primary: '#480081'
  primary-container: '#8a2be2'
  on-primary-container: '#eed9ff'
  inverse-primary: '#8422dc'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb873'
  on-tertiary: '#4b2800'
  tertiary-container: '#935400'
  on-tertiary-container: '#ffdaba'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#efdbff'
  primary-fixed-dim: '#dcb8ff'
  on-primary-fixed: '#2c0051'
  on-primary-fixed-variant: '#6700b5'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcbf'
  tertiary-fixed-dim: '#ffb873'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6a3b00'
  background: '#111125'
  on-background: '#e2e0fc'
  surface-variant: '#333348'
  surface-deep: '#0F0F1E'
  surface-glass: rgba(26, 26, 46, 0.7)
  slate-muted: '#94A3B8'
  electric-glow: 'linear-gradient(135deg, #8A2BE2 0%, #4B0082 100%)'
  success-glow: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for high-stakes competitive examination prep (NEET/JEE), blending the precision of an AI-first tool with the prestige of a high-end educational institution. The brand personality is **Intelligent, Aspirational, and Sophisticated**. It targets students who demand speed, clarity, and a sense of mastery.

The visual style is **Corporate Modern with Glassmorphism**. It utilizes depth through semi-transparent layers, backdrop blurs, and elegant gradients to highlight "AI-enhanced" features. The interface should feel like a premium command center—focused on reducing cognitive load while maintaining an energetic, high-performance aesthetic.

## Colors
The palette is rooted in **Deep Indigo (#1A1A2E)** to provide a stable, focus-oriented background that reduces eye strain during long study sessions. **Electric Violet (#8A2BE2)** is reserved for the "AI Engine"—it signifies intelligence, insights, and premium features.

**Emerald Green (#10B981)** serves as the "Mastery" color, used exclusively for success states, completed goals, and correct answers. For secondary information, use **Slate Grays** to maintain a clear hierarchy without competing with the primary brand accents. In Light Mode, the Indigo base transitions to a crisp white/light-gray palette, maintaining the Violet and Green accents for brand consistency.

## Typography
The system uses a pairing of **Sora** for headings and **Inter** for UI and body copy. Sora’s geometric, modern curves provide the "AI/Tech" feel for display text, while Inter’s exceptional legibility ensures that complex scientific questions (NEET/JEE content) are easy to parse.

Headlines should be bold and impactful to create clear section breaks. For body text, maintain generous line-heights (1.5x) to prevent dense text blocks from appearing overwhelming. Use the `label-md` style for progress indicators and technical metadata to distinguish it from instructional content.

## Layout & Spacing
This design system employs an **8px grid (with 4px sub-steps)** to ensure mathematical alignment. The layout is a **Fixed-Fluid hybrid**: on desktop, content is contained within a 1280px max-width container with a 12-column grid. On mobile, it transitions to a 4-column layout with 16px side margins.

Spacing should be generous to evoke a premium feel. Group related items (like a question and its options) with `sm` or `md` spacing, while separating major sections (like Subject categories) with `xl` or `xxl` spacing. Use `gutter` for consistent vertical rhythm between grid-based cards.

## Elevation & Depth
Elevation is communicated through **Glassmorphic Tonal Layers**. Surfaces are not just flat colors; they utilize varying degrees of opacity and blur:

1.  **Base (Level 0):** Solid Deep Indigo (#1A1A2E).
2.  **Raised (Level 1):** Subtle surface contrast using a slightly lighter indigo or 5% white overlay.
3.  **Glass (Level 2):** Applied to primary interactive cards. Uses `backdrop-filter: blur(12px)` and a semi-transparent white border (0.5px, 10% opacity) to create a "frosted" edge.
4.  **Floating (Level 3):** Used for AI Modals and tooltips. Features a soft, diffused shadow (`0px 20px 40px rgba(0, 0, 0, 0.4)`) and a violet tinted inner-glow to suggest the element is powered by the AI engine.

## Shapes
The shape language is defined by large, friendly radii that soften the technical nature of the content. UI elements like input fields and small buttons use **rounded-lg (1rem)**. Primary containers, cards, and large call-to-action sections use **rounded-xl (1.5rem)** to create a distinct, modern SaaS silhouette. This high level of roundedness reinforces the "approachable but sophisticated" brand promise.

## Components

-   **AI Command Buttons:** Primary actions should use the `electric-glow` gradient with white text. Apply a subtle outer glow on hover to simulate "powering up."
-   **Mastery Chips:** Small indicators for topics mastered. Use a subtle Emerald Green background with a check icon.
-   **Glassmorphic Cards:** The flagship component. Must feature a subtle 1px border with a linear gradient (top-left to bottom-right: 15% white to 5% white) to catch the "light."
-   **Input Fields:** Dark, recessed backgrounds with 1px Slate Gray borders. Upon focus, the border should transition to Electric Violet with a soft outer glow.
-   **Progress Bars:** Multi-layered tracks. The background track is semi-transparent indigo; the progress fill is a gradient from Electric Violet to Emerald Green to symbolize the journey toward mastery.
-   **Segmented Controls:** Pill-shaped backgrounds with a sliding "glass" layer that moves to the active selection.
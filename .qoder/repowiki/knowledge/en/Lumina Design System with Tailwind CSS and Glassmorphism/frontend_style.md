## Overview

The Neetlu Exam Preparation Platform uses a **custom design system called "Lumina"** built on top of **Tailwind CSS v3.4**, combining utility-first classes with extensive custom CSS modules. The styling architecture emphasizes a dark-mode-first aesthetic with purple/violet accent colors, glassmorphism effects, and responsive mobile-first layouts.

## Styling Architecture

### Build Stack
- **Tailwind CSS** (v3.4.17) as the primary utility framework
- **PostCSS** with `autoprefixer` for vendor prefixing
- **Vite** as the build tool with React plugin
- Three main CSS entry points imported in `main.tsx`:
  - `styles/stitch.css` — Tailwind directives + app chrome styles
  - `styles/analytics.css` — Analytics page-specific styles
  - `styles.css` — Legacy UI component styles

### Theme System

**Dual-theme support** via CSS custom properties toggled by `data-theme` attribute:
- Light theme: `#f5f4fa` background, `#6d28d9` primary
- Dark theme (default): `#111125` background, `#dcb8ff` primary
- Theme persistence via `localStorage` with key `exam-hunt-theme`
- System preference detection via `prefers-color-scheme` media query
- Theme applied before React mount to prevent flash

**Design tokens** defined as CSS variables following Material Design 3 naming conventions:
- Surface hierarchy: `--surface`, `--surface-dim`, `--surface-container-*`, `--surface-glass`
- Color roles: `--primary`, `--secondary`, `--tertiary`, `--error` with container/fixed variants
- Typography: `--font-display` (Sora), `--font-body` (Inter)
- Spacing: `--radius-lg` (12px), `--radius-xl` (16px)

### Tailwind Configuration

Custom theme extensions in `tailwind.config.js`:
- **Colors**: All mapped to CSS variables (e.g., `background: var(--background)`)
- **Typography**: Named font families (`headline-lg`, `body-md`, etc.) using Sora/Inter
- **Spacing scale**: Semantic tokens (`unit`, `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `gutter`)
- **Border radius**: Extended with `xxl: 1.5rem`
- **Background images**: Gradient utilities (`electric-glow`, `success-glow`)

## Key Visual Patterns

### Glassmorphism
Core `.glass-card` class used throughout:
```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
```
Variants exist for specific contexts (bank cards, analytics panels).

### Electric Glow Aesthetic
Signature purple gradient buttons and accents:
```css
background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
box-shadow: 0 0 20px rgba(138, 43, 226, 0.3);
```
Used for CTAs, logos, and interactive elements.

### Responsive Layout Strategy
- **Mobile-first** with breakpoints at 640px, 768px, 1024px
- Sticky headers with safe-area-inset support for notched devices
- Bottom navigation on mobile (<768px), hidden on desktop
- Grid systems that adapt: 1-col → 2-col → 3/4-col based on viewport
- App chrome heights tracked via CSS variables (`--app-header-h`, `--app-bottom-h`)

### Component Library Approach
No external UI library (no MUI, Chakra, etc.). Instead:
- Custom BEM-style class names (`.lumina-header`, `.bank-card`, `.dash-hero`)
- Reusable utility patterns (`.glass-card`, `.btn-electric`, `.btn-glass`)
- Icon system using Google Material Symbols Outlined font
- KaTeX integration for math rendering with dedicated CSS import

## File Organization

**Style files:**
- `frontend/src/styles.css` (1734 lines) — Legacy browse/question viewer styles
- `frontend/src/styles/lumina.css` (1864 lines) — Lumina design system core
- `frontend/src/styles/stitch.css` (1771 lines) — Tailwind base + app shell
- `frontend/src/styles/analytics.css` (16153 lines) — Comprehensive analytics dashboard styles

**Theme logic:**
- `frontend/src/utils/theme.ts` — Theme resolution, storage, DOM application
- `frontend/src/hooks/useTheme.ts` — React hook for theme state management

**Configuration:**
- `frontend/tailwind.config.js` — Theme extensions, color mappings
- `frontend/postcss.config.js` — PostCSS plugin setup

## Developer Conventions

1. **Always use CSS variables** for colors instead of hardcoded values
2. **Prefer Tailwind utilities** for layout/spacing, custom CSS for complex visual effects
3. **Follow BEM-like naming** for custom components (`.block__element--modifier`)
4. **Use semantic spacing tokens** from Tailwind config (`spacing.unit` through `spacing.xxl`)
5. **Apply glassmorphism** consistently via `.glass-card` or its variants
6. **Support both themes** — test in light and dark modes
7. **Mobile-first media queries** — start with mobile styles, enhance for larger screens
8. **Safe area insets** — account for notched devices with `env(safe-area-inset-*)`
9. **Touch targets** — minimum 2.75rem height for interactive elements on mobile
10. **Font pairing** — Sora for headings/displays, Inter for body text
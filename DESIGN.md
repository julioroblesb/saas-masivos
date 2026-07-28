---
name: Masivos
description: SaaS Administrative Dashboard for Spa & Automations
colors:
  primary: '#E11D48'
  primary-light: '#FFE4E6'
  secondary: '#0A0A0A'
  secondary-light: '#18181B'
  success: '#10B981'
  danger: '#F43F5E'
  warning: '#F59E0B'
  info: '#3B82F6'
  dark: '#111111'
  dark-light: '#27272A'
  white-light: '#FAFAFA'
  white-dark: '#A1A1AA'
typography:
  display:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.125
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: '6px'
  md: '8px'
  lg: '12px'
  xl: '16px'
spacing:
  sm: '8px'
  md: '16px'
  lg: '24px'
components:
  panel:
    backgroundColor: '{colors.dark}'
    textColor: '{colors.white-light}'
    rounded: '{rounded.xl}'
    padding: '20px'
---

# Design System: Masivos

## 1. Overview

**Creative North Star: "Calm Enterprise Clarity"**

A high-efficiency administrative workspace designed for busy beauty salons and spas. Typography and data scanning take priority over decoration: the interface must feel native, calm and predictable during long work sessions.

This design avoids warm "cream" SaaS default styles, relying instead on off-black, crisp borders, and clean typography to keep information highly legible, reduced in cognitive load, and visually striking.

**Key Characteristics:**

- Sleek dark tech background (`#0A0A0A`) with rose pink accent (`#E11D48`).
- Rounded layout panels (`16px` border-radius) with subtle border frames (`#27272A`).
- Zero-download native system typography.
- Flat, high-contrast, state-reactive user interfaces.

## 2. Colors

The color palette is anchored by a vibrant rose pop accent representing cosmetic art, balanced against rich, off-black tones.

### Primary

- **Vibrant Rose Pop** (#E11D48): Used for key call-to-actions, status completion indicators, and active navigation states.

### Secondary

- **Dark Tech Base** (#0A0A0A): The foundation background color. Deep, immersive off-black that avoids absolute pitch darkness.

### Neutral

- **White Light** (#FAFAFA): The primary high-contrast text color on dark backgrounds.
- **White Dark** (#A1A1AA): Secondary/muted label and description text.
- **Border Gray** (#27272A): Defining grid and panel borders.

**The Rose Pop Rule.** Use the vibrant rose pop color strictly for interactive highlights, main buttons, and successful completed statuses. The accent should cover less than 10% of any dashboard screen to retain its impact.

**The Tinted Neutral Rule.** Muted texts or labels must be rendered in `#A1A1AA` to preserve strict 4.5:1 contrast against `#111111` or `#0A0A0A`. Never use washed-out dark gray text.

## 3. Typography

**Display Font:** native `system-ui` stack
**Body Font:** native `system-ui` stack

### Hierarchy

- **Display / large metric** (700, `2rem`, `2.25rem`): Executive totals and exceptional display copy.
- **Page title / H1** (650, `1.5rem`, `1.75rem`): Primary transactional view title.
- **Section / H2** (650, `1.25rem`, `1.5rem`): Card and formal section grouping.
- **Component / H3** (650, `1.125rem`, `1.5rem`): Dialog and contextual panel titles.
- **Body** (400, `1rem`, `1.5rem`): Prose, notes and sustained reading.
- **Compact UI** (400–600, `0.875rem`, `1.25rem`): Tables, menus, forms and dense controls.
- **Microcopy** (500–650, `0.75rem`, `1rem`): Badges and truly tertiary metadata only.

All quantitative values use `font-variant-numeric: tabular-nums lining-nums`. Quantitative table columns and their headers align right; descriptive data aligns left. Narrative lines are capped at `65ch`. Prose may never be smaller than `1rem`; compact transactional UI may never be smaller than `0.875rem`; nothing may render below `0.75rem`.

Long text, table headers and form labels use sentence case. Uppercase is reserved for very short badges where it does not impair scanning. Spacing follows a 4/8-point rhythm, and normal text must meet WCAG AA contrast of at least 4.5:1.

## 4. Elevation

The design is flat-by-default, emphasizing clear layouts, clean line boundaries (`#27272A`), and color changes over heavy shadows.

**The Flat-By-Default Rule.** Do not use heavy box shadows or glassmorphism. Depth is achieved entirely through background color hierarchy (background at `#0A0A0A`, panels at `#111111`).

## 5. Components

### Panels

- **Shape:** Rounded corners (`16px`).
- **Style:** Background `#111111` with a `1px` border of `#27272A`.

### Buttons

- **Shape:** Rounded (`8px`).
- **Primary:** Background `#E11D48`, text `#FAFAFA`, with padding `10px 24px`.
- **Secondary:** Background `#27272A`, text `#FAFAFA`, with border `#27272A`.

### Inputs

- **Shape:** Rounded (`8px`).
- **Style:** Background `#0A0A0A`, border `#27272A`, text `#FAFAFA`.
- **Focus:** Border changes to `#E11D48` with a clean transition.

## 6. Do's and Don'ts

### Do:

- **Do** keep text line lengths under 75 characters for prose description block readability.
- **Do** use `text-wrap: balance` on display headers to prevent awkward trailing words.
- **Do** use high-contrast text (`#FAFAFA`) on all main headings.

### Don't:

- **Don't** use side-stripe borders (e.g. `border-left: 4px solid #E11D48`) on panel headers or cards.
- **Don't** apply gradients to text headers (`background-clip: text`).
- **Don't** use pure `#000000` or generic slate-gray backgrounds.
- **Don't** pair rounded icons or default eyebrows above every dashboard category card.

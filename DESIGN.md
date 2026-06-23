---
name: Masivos
description: SaaS Administrative Dashboard for Spa & Automations
colors:
  primary: "#E11D48"
  primary-light: "#FFE4E6"
  secondary: "#0A0A0A"
  secondary-light: "#18181B"
  success: "#10B981"
  danger: "#F43F5E"
  warning: "#F59E0B"
  info: "#3B82F6"
  dark: "#111111"
  dark-light: "#27272A"
  white-light: "#FAFAFA"
  white-dark: "#A1A1AA"
typography:
  display:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  panel:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.white-light}"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: Masivos

## 1. Overview

**Creative North Star: "The Neon Tech Salon"**

A premium administrative workspace designed to serve busy beauty salons and spas. The system uses a sleek, high-efficiency dark tech theme with vibrant rose pop highlights to reflect cosmetic creativity and operational energy. 

This design avoids warm "cream" SaaS default styles, relying instead on off-black, crisp borders, and clean typography to keep information highly legible, reduced in cognitive load, and visually striking.

**Key Characteristics:**
* Sleek dark tech background (`#0A0A0A`) with rose pink accent (`#E11D48`).
* Rounded layout panels (`16px` border-radius) with subtle border frames (`#27272A`).
* Nunito-driven modern sans-serif typography.
* Flat, high-contrast, state-reactive user interfaces.

## 2. Colors

The color palette is anchored by a vibrant rose pop accent representing cosmetic art, balanced against rich, off-black tones.

### Primary
* **Vibrant Rose Pop** (#E11D48): Used for key call-to-actions, status completion indicators, and active navigation states.

### Secondary
* **Dark Tech Base** (#0A0A0A): The foundation background color. Deep, immersive off-black that avoids absolute pitch darkness.

### Neutral
* **White Light** (#FAFAFA): The primary high-contrast text color on dark backgrounds.
* **White Dark** (#A1A1AA): Secondary/muted label and description text.
* **Border Gray** (#27272A): Defining grid and panel borders.

**The Rose Pop Rule.** Use the vibrant rose pop color strictly for interactive highlights, main buttons, and successful completed statuses. The accent should cover less than 10% of any dashboard screen to retain its impact.

**The Tinted Neutral Rule.** Muted texts or labels must be rendered in `#A1A1AA` to preserve strict 4.5:1 contrast against `#111111` or `#0A0A0A`. Never use washed-out dark gray text.

## 3. Typography

**Display Font:** Nunito
**Body Font:** Nunito

### Hierarchy
* **Display** (700, `clamp(1.5rem, 4vw, 2.5rem)`, 1.2): Used for primary headers and page title greetings.
* **Headline** (600, `1.25rem`, 1.3): Used for section sub-headers and table grouping.
* **Body** (400, `14px`, 1.5): Used for general content, lists, form descriptions, and table rows.
* **Label** (500, `12px`, 0.05em, uppercase): Used for table headers, helper texts, and input title labels.

## 4. Elevation

The design is flat-by-default, emphasizing clear layouts, clean line boundaries (`#27272A`), and color changes over heavy shadows.

**The Flat-By-Default Rule.** Do not use heavy box shadows or glassmorphism. Depth is achieved entirely through background color hierarchy (background at `#0A0A0A`, panels at `#111111`).

## 5. Components

### Panels
* **Shape:** Rounded corners (`16px`).
* **Style:** Background `#111111` with a `1px` border of `#27272A`.

### Buttons
* **Shape:** Rounded (`8px`).
* **Primary:** Background `#E11D48`, text `#FAFAFA`, with padding `10px 24px`.
* **Secondary:** Background `#27272A`, text `#FAFAFA`, with border `#27272A`.

### Inputs
* **Shape:** Rounded (`8px`).
* **Style:** Background `#0A0A0A`, border `#27272A`, text `#FAFAFA`.
* **Focus:** Border changes to `#E11D48` with a clean transition.

## 6. Do's and Don'ts

### Do:
* **Do** keep text line lengths under 75 characters for prose description block readability.
* **Do** use `text-wrap: balance` on display headers to prevent awkward trailing words.
* **Do** use high-contrast text (`#FAFAFA`) on all main headings.

### Don't:
* **Don't** use side-stripe borders (e.g. `border-left: 4px solid #E11D48`) on panel headers or cards.
* **Don't** apply gradients to text headers (`background-clip: text`).
* **Don't** use pure `#000000` or generic slate-gray backgrounds.
* **Don't** pair rounded icons or default eyebrows above every dashboard category card.

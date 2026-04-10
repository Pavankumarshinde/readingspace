# Design System Specification: High-End Editorial Experience

## 1. Overview & Creative North Star

### Creative North Star: "The Private Archive"
This design system is built to feel like a high-end physical reading room—intentional, quiet, and deeply authoritative. It moves away from the "disposable" web and toward a "permanent" editorial aesthetic. We achieve this by blending the structural rigor of the Apple Human Interface Guidelines with the tactile warmth of a boutique literary journal.

**Design Philosophy:**
*   **Intentional Asymmetry:** Break the monotony of standard grids by using varying column widths and overlapping editorial elements.
*   **The "Quiet" UI:** Interface elements remain invisible until needed. Focus is placed entirely on the content.
*   **Surface Depth:** We do not use lines to separate ideas; we use the physical "stacking" of paper-like layers.

---

## 2. Colors

The palette is rooted in earth tones, providing a sense of heritage and calm. It avoids the harshness of pure black and white, opting for "Ink" and "Cream" to reduce eye strain during long reading sessions.

### Core Tokens
*   **Primary (Rust):** `#9B4000` (derived from `#D4611A`) – Used for primary actions and brand emphasis.
*   **Secondary (Warm Brown):** `#885033` – Used for subtle accents and secondary interactive elements.
*   **Tertiary (Bright Blue):** `#00609A` – Used strictly for functional "system" states (links, focus indicators, active progress).
*   **Surface (Pale Cream):** `#FBF8FF` – The foundational canvas.
*   **Ink (Neutral):** `#1B1B20` – For body text and deep contrast elements.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders for sectioning or containment. 
Boundary definition must be achieved through **Background Color Shifts**. To separate a sidebar from a main content area, use `surface-container-low` against a `surface` background. The change in tone is the divider.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers:
1.  **Level 0 (Surface):** The base background.
2.  **Level 1 (Surface-Container-Low):** Large content sections (e.g., the 200px fixed left sidebar).
3.  **Level 2 (Surface-Container-Lowest/White):** Cards and focused reading areas. This creates a "lifted" effect where the most important content feels closest to the user.

### Signature Textures
*   **Glassmorphism:** For floating menus or pop-overs, use `surface` colors at 80% opacity with a `20px` backdrop-blur. 
*   **The Soft Gradient:** While buttons remain flat, hero sections may use a subtle linear gradient from `primary` to `primary-container` (at a 15-degree angle) to add "soul" and depth to the brand's entry point.

---

## 3. Typography

The typography strategy relies on the tension between a high-contrast Serif and a functional, modern Sans-serif.

| Level | Font Family | Weight | Size | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | Playfair Display | Bold (700) | 3.5rem | Dramatic editorial moments |
| **Headline** | Playfair Display | Bold (700) | 2.0rem | Section starts, article titles |
| **Title** | Plus Jakarta Sans | Medium (500) | 1.125rem | Card headers, navigation |
| **Body** | Plus Jakarta Sans | Regular (400) | 1.0rem | Long-form reading |
| **Label** | Plus Jakarta Sans | Semi-Bold (600) | 0.75rem | Metadata, caps/spaced for badges |

**Editorial Spacing:** For `Display` and `Headline` levels, decrease letter-spacing by `-0.02em` to create a "tight," custom-typeset appearance. For `Label` variants used in metadata, increase letter-spacing to `0.05em` for a premium, archival feel.

---

## 4. Elevation & Depth

We reject the standard "Drop Shadow" in favor of **Tonal Layering** and **Ambient Light**.

*   **The Layering Principle:** Use the color tokens `surface-container-low` through `surface-container-highest` to stack elements. 
*   **Ambient Shadows:** If a card must "float" (e.g., a modal), use a shadow that mimics natural light:
    *   `X: 0, Y: 12, Blur: 40, Spread: 0, Color: rgba(27, 27, 32, 0.06)`
*   **The "Ghost Border" Fallback:** If a layout requires a boundary for accessibility (e.g., an input field), use the `outline-variant` token at **15% opacity**. Never use a 100% opaque border.
*   **Corner Radii:**
    *   **10px:** Small components (Buttons, Input fields).
    *   **16px/24px:** Standard content cards.
    *   **32px:** Large container sections or featured hero cards.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary` color. Squared edges (10px radius). No pill shapes. White text.
*   **Secondary:** Solid `surface-container-highest` with `on-surface` text.
*   **Tertiary:** No background. `primary` text with a subtle underline appearing only on hover.

### Inputs & Search
*   **Style:** `surface-container-lowest` (White) background.
*   **Border:** Ghost Border (15% opacity `outline-variant`).
*   **Interaction:** On focus, the border opacity increases to 40% and the label moves with a 200ms ease-out transition.

### Cards
*   **Rule:** Forbid divider lines within cards.
*   **Layout:** Use the 8px grid to create massive internal padding (e.g., 32px or 40px). Separate "Header," "Body," and "Footer" of a card using vertical whitespace alone.

### Fixed Sidebar (200px)
*   **Layout:** Fixed to the left. Background: `surface-container-low`. 
*   **Navigation:** Active states should be indicated by a `primary` vertical bar (4px wide) on the far left of the item, rather than highlighting the whole row.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins to give the content "breathing room" like a magazine layout.
*   **Do** use `Plus Jakarta Sans` in its Mono variant for page numbers or technical metadata.
*   **Do** prioritize vertical rhythm over horizontal density.
*   **Do** use `secondary` (Warm Brown) for icons to keep the UI soft.

### Don’t
*   **Don’t** use pill-shaped (fully rounded) buttons. It breaks the editorial "block" aesthetic.
*   **Don’t** use "Blue" for anything other than essential system feedback (links, successes).
*   **Don’t** ever use a solid black (`#000000`) border or text. Use `Ink` (`#1B1B20`).
*   **Don’t** use dividers. If you feel the need for a line, try adding 16px of extra whitespace instead.

---
**Director's Note:** This system is about the *void* as much as the *content*. Respect the margins. If the layout feels "crowded," you have failed the aesthetic.
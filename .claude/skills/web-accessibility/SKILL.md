---
name: web-accessibility
description: >-
  Audit and fix web accessibility (a11y / WCAG) for this Next.js + Tailwind app.
  Use when adding or reviewing forms, buttons, links, modals, menus, tables,
  images, color choices, or keyboard interaction — or whenever the user mentions
  accessibility, a11y, screen readers, keyboard navigation, contrast, ARIA, or
  WCAG. Covers correct RTL/Arabic semantics.
---

# Web accessibility (WCAG 2.1 AA)

Make the app usable with a keyboard, a screen reader, and low vision. This is an
Arabic RTL app, so language and direction semantics matter as much as ARIA.

## Semantics first, ARIA second

The best ARIA is the HTML you didn't have to fake.

- Use the **real element**: `<button>` for actions, `<a href>` for navigation,
  `<label>` for inputs, `<nav> <main> <header> <ul>` for structure. A clickable
  `<div>` is an accessibility bug — it's not focusable or announced.
- One `<h1>` per page; headings descend without skipping levels. Don't pick a heading
  by how big it looks — style with classes, structure with `h1–h6`.
- Icon-only buttons need an accessible name: `aria-label="…"` (in Arabic, matching
  the UI) or visually-hidden text. A bare `<button>🗑️</button>` announces nothing useful.
- Add ARIA only to fill gaps native HTML can't (`aria-expanded`, `aria-current`,
  `role="dialog"`, `aria-live`). Wrong ARIA is worse than none.

## Language & direction (Arabic)

- The root is `lang="ar" dir="rtl"` — keep it. Any Latin/English sub-content
  (a username, a URL, code) should carry `lang="en"` and often `dir="ltr"` so screen
  readers switch voice and reading order correctly.
- Never override direction with physical CSS that fights the DOM order; keep DOM order
  = reading order.

## Keyboard

- Everything interactive must be reachable and operable with **Tab / Shift+Tab /
  Enter / Space**, in a logical order (which in RTL flows right-to-left visually but
  follows DOM order).
- **Visible focus indicator on every focusable element** — never `outline: none`
  without a replacement. Use `focus-visible:ring-2 focus-visible:ring-<accent>-500`.
- Modals/menus: focus moves in on open, is **trapped** while open, `Esc` closes,
  and focus **returns** to the trigger on close.
- No keyboard traps; no positive `tabindex`.

## Forms

- Every control has a programmatically associated `<label htmlFor>` (placeholder is
  not a label). Group related fields with `<fieldset>`/`<legend>`.
- Errors: set `aria-invalid`, link the message with `aria-describedby`, and announce
  it (`role="alert"` / `aria-live="assertive"`). Don't signal errors by color alone.
- Required fields marked in text/`aria-required`, not just a red asterisk.

## Color & contrast

- Text contrast ≥ **4.5:1** (normal) / **3:1** (large ≥ 24px or 18.66px bold).
  `text-neutral-400` on white fails for body text — reserve it for decoration, use
  `text-neutral-600`+ for real content.
- UI component/state boundaries and focus rings ≥ **3:1** against their background.
- Never encode meaning in color alone — pair with text, icon, or shape (e.g. an error
  needs words, not just a red border).

## Images & media

- Meaningful `<img>` gets descriptive `alt`; decorative images get `alt=""`.
- Don't put essential information only in an image of text.

## Motion & zoom

- Respect `prefers-reduced-motion` for animations/transitions.
- Layout must survive 200% zoom and 320px width without loss of content or horizontal
  scrolling of the whole page.

## How to audit

1. **Tab through the whole page** — can you reach and operate everything, is focus
   always visible, does order make sense in RTL?
2. **Check the accessibility tree** (DevTools) — do controls have names/roles/states?
3. **Contrast-check** text and focus rings.
4. **Labels** — every input associated; every icon button named.
5. Report findings as concrete file/line fixes, most severe first, and apply them.

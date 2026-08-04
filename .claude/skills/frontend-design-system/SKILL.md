---
name: frontend-design-system
description: >-
  Build and edit polished, consistent UI for this Next.js + Tailwind app. Use
  whenever creating or changing a React component, page, form, table, card,
  button, modal, or any visual element under src/components or src/app — and
  whenever styling, spacing, color, typography, or layout is involved. Enforces
  a shared design system and correct RTL/Arabic direction handling.
---

# Frontend design system

This project is an Arabic (RTL) lyrics manager: **Next.js 15 App Router, React 19,
Tailwind CSS 3**. The root layout sets `lang="ar" dir="rtl"` and the Tajawal font
(`font-sans`). Every screen is right-to-left first. Build UI that looks like it was
designed by one person, not assembled from parts.

## Design tokens (use these, don't improvise)

Stay inside a small, deliberate scale so screens feel unified.

- **Neutrals / surfaces:** `bg-neutral-50` (page), `bg-white` (cards/inputs),
  borders `border-neutral-200` / `border-neutral-300`. Text `text-neutral-900`
  (primary), `text-neutral-600` (secondary), `text-neutral-400` (muted/placeholder).
- **Accent:** pick **one** brand hue and reuse it for primary actions, links, and
  focus rings — do not mix `blue`, `indigo`, `emerald` on one screen. Match whatever
  the existing components already use; grep before introducing a new color.
- **Danger:** `red-600` for destructive actions and error text only.
- **Radius:** `rounded-lg` for inputs/buttons/cards, `rounded-full` for pills/avatars.
  Be consistent — the existing inputs use `rounded-lg` (see `globals.css`).
- **Spacing:** stick to Tailwind's scale in steps of 2 (`gap-2 gap-3 gap-4 gap-6`).
  Vertical rhythm on a page: `space-y-6`. Inside a card: `p-4` or `p-6`.
- **Type scale:** `text-sm` (meta), `text-base` (body), `text-lg`/`text-xl`
  (section titles), `text-2xl`+ (page title). Weight with `font-medium`/`font-semibold`,
  not size alone. Body line-height for Arabic runs long — use `leading-8`/`leading-loose`
  for lyric/prose blocks (the editor already uses `line-height: 2`).

## RTL is the default — get direction right

The document is `dir="rtl"`. **Never** hardcode physical left/right when you mean
start/end — it breaks in RTL.

- Use **logical utilities**: `ms-*`/`me-*` (margin-start/end), `ps-*`/`pe-*`,
  `start-*`/`end-*`, `text-start`/`text-end` — NOT `ml-*`, `mr-*`, `left-*`,
  `right-*`, `text-left`, `text-right`.
- Flex rows already reverse correctly under RTL; don't add `flex-row-reverse` to
  "fix" them — that double-flips.
- Icons that imply direction (back/forward arrows, chevrons) point the opposite way
  in RTL. A "back" chevron points **right** here. Mirror them (`rtl:-scale-x-100`) or
  choose the correct glyph.
- Numbers, code, URLs, and Latin snippets embedded in Arabic text may need
  `dir="ltr"` or `dir="auto"` on the inline element to render in the right order.
- Test any layout change by actually reading it right-to-left.

## Component patterns

- **Buttons:** one primary style (solid accent, white text), one secondary
  (white bg, `border-neutral-300`), one ghost/text, one danger. Reuse them; do not
  re-style buttons ad hoc per screen.
- **Inputs:** `w-full rounded-lg border border-neutral-300 px-3 py-2` with a visible
  focus ring (`focus:ring-2 focus:ring-<accent>-500 focus:border-<accent>-500
  focus:outline-none`). Always pair with a `<label>`.
- **Cards:** `rounded-lg border border-neutral-200 bg-white p-4` — lean on borders,
  not heavy shadows. If you use shadow, keep it soft (`shadow-sm`) and consistent.
- **Never leave interactive elements without a visible `:hover` and `:focus-visible`
  state.** Add a `transition-colors` for polish.

## Every element gets its states

For any list/data view or async action, design **all** states, not just the happy path:

- **Loading** — skeletons or a spinner, never a blank flash.
- **Empty** — a friendly message + a clear next action (e.g. "add your first…"),
  not an empty box.
- **Error** — human-readable message in `text-red-600`, with a retry path.
- **Disabled / in-flight** — disable submit buttons while a request is pending and
  show it (`disabled:opacity-50 disabled:cursor-not-allowed`).

## Responsive & consistent

- Mobile-first. Verify at ~375px width, then layer `sm: md: lg:` up. Content wraps
  in `mx-auto max-w-5xl px-4` (matches the root `<main>`).
- Tap targets ≥ 44px. Don't ship rows of tiny icon buttons on mobile.
- Before adding a new pattern, **grep `src/components` for an existing one** and match
  it. Reuse beats reinvention; two slightly different modals is a bug.

## Before you finish

- No physical-direction classes where logical ones belong.
- Colors/spacing/radius stay within the tokens above.
- Hover + focus-visible states present on every interactive element.
- Loading / empty / error states handled.
- `npm run lint` is clean.

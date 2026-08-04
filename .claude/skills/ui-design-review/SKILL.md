---
name: ui-design-review
description: >-
  Critique the UI/UX quality of front-end changes in this Next.js + Tailwind app
  before they ship. Use when the user asks for a design review, UI review, UX
  feedback, a critique of a screen/component, or "does this look good / how can
  this be better" — and proactively after building or significantly changing any
  page or component. Produces prioritized, actionable feedback and applies fixes.
---

# UI/UX design review

Evaluate a screen or component the way a senior product designer would: not "is it
broken" (that's a bug review) but "is it good — clear, consistent, usable, and
polished." This is an Arabic **RTL** app; judge it as a right-to-left reader.

Pair this with the `frontend-design-system` skill (the standards to measure against)
and `web-accessibility` (a11y is part of quality, not separate).

## How to run a review

1. **See it, don't guess.** Read the component/page code. When feasible, run the app
   (`npm run dev`) or render the component and look at it at ~375px and desktop widths.
   Review what actually renders, including loading/empty/error states.
2. **Walk the user's task**, right-to-left. What are they trying to do here? Is the
   primary action obvious within 3 seconds? Count the steps and the friction.
3. **Score against the dimensions below**, noting concrete issues with file:line.
4. **Prioritize**: P1 blocks or confuses users, P2 hurts polish/consistency, P3 is
   nice-to-have. Lead with P1.
5. **Apply the fixes** you're confident about; list the judgment calls for the user.

## Review dimensions

**Visual hierarchy**
- Does the eye land on the most important thing first? One clear primary action per
  view — not three competing buttons.
- Size, weight, color, and spacing should encode importance. If everything is bold,
  nothing is.

**Consistency**
- Same concept, same look everywhere: buttons, inputs, cards, spacing, radius, and the
  single accent color. Grep siblings in `src/components` — does this match them?
- Alignment to a grid; consistent gaps. Ragged spacing reads as "unfinished."

**Spacing & layout**
- Enough whitespace to breathe; related things grouped (proximity), unrelated things
  separated. Content respects `max-w-5xl px-4`.
- No cramped tap targets, no elements kissing the viewport edge.

**Typography**
- Sensible type scale, limited number of sizes/weights. Arabic body text needs generous
  line-height (`leading-8`/`leading-loose`) and comfortable measure.

**Color & contrast**
- One accent hue used with intent; neutrals for everything else; red only for danger.
- Text meets contrast (see `web-accessibility`). Muted `neutral-400` is not body text.

**Direction (RTL)**
- Reads naturally right-to-left. No stray physical `ml/mr/left/right` where logical
  `ms/me/start/end` belong. Directional icons point the correct way.

**States & feedback**
- Loading, empty, error, disabled, hover, and focus are all designed — not just the
  happy path. Actions give feedback; destructive actions confirm.
- Forms show inline, human-readable validation.

**Responsiveness**
- Works from 320–375px up. No horizontal page scroll, no overflow, tap targets ≥ 44px.

**Microcopy**
- Labels and messages are clear, in natural Arabic, and action-oriented ("احفظ
  التغييرات" beats "إرسال"). Errors say what happened and what to do next.

## Output format

Give a short verdict, then grouped findings:

```
## Design review — <screen/component>
Verdict: <one line>

### P1 — fix before ship
- <issue> — <why it hurts the user> — <fix>  (file:line)

### P2 — polish & consistency
- …

### P3 — nice to have
- …
```

Be specific and kind: name the problem, the impact, and the concrete change. Prefer
showing the improved Tailwind/JSX over describing it. Then apply the safe fixes.

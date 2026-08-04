/**
 * Shared UI class tokens — the single source of truth for buttons, inputs, and
 * focus styling. See .claude/skills/frontend-design-system for the rationale.
 *
 * Reuse these instead of hand-writing class strings so every screen shares the
 * same radius, focus ring, and states.
 */

/** Visible keyboard-focus ring for any interactive element (WCAG 2.4.7). */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Standard text input / textarea / select. */
export const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

/** Compact variant for dense contexts (inline table edits, small forms). */
export const inputSm =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
  focusRing;

/** Primary action — one per view. */
export const btnPrimary = `${btnBase} bg-emerald-700 px-4 py-2.5 text-white hover:bg-emerald-800`;

/** Secondary / neutral action. */
export const btnSecondary = `${btnBase} border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 hover:bg-neutral-50`;

/** Destructive action. */
export const btnDanger = `${btnBase} border border-red-300 bg-white px-4 py-2.5 text-red-700 hover:bg-red-50`;

"use client";

import { useInstallPrompt } from "@/lib/use-install-prompt";
import { focusRing } from "@/lib/ui";

/**
 * زرّ «تثبيت التطبيق» المخصص في شريط التنقّل — لا يظهر إن كان التطبيق مثبّتًا
 * بالفعل أو غير قابل للتثبيت (راجع lib/use-install-prompt.ts لتفاصيل السلوك).
 */
export function PWAInstallButton() {
  const { installable, installing, install } = useInstallPrompt();

  if (!installable) return null;

  return (
    <button
      type="button"
      onClick={install}
      disabled={installing}
      className={`inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      تثبيت التطبيق
    </button>
  );
}

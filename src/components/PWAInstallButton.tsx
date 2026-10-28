"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
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

/** عنصر «تثبيت التطبيق» بمظهر روابط درج القائمة — لا يظهر إن تعذّر التثبيت. */
export function PWAInstallMenuItem({
  className,
  iconClassName,
  onDone,
}: {
  className: string;
  iconClassName: string;
  onDone?: () => void;
}) {
  const { installable, installing, install } = useInstallPrompt();

  if (!installable) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await install();
        onDone?.();
      }}
      disabled={installing}
      className={`text-start font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Download className={`${iconClassName} !text-emerald-700`} aria-hidden="true" />
      تثبيت التطبيق
    </button>
  );
}

/**
 * زرّ تثبيت عائم أسفل منتصف الشاشة، مع زرّ إغلاق. الإغلاق في الذاكرة فقط: يبقى
 * مخفيًّا أثناء التنقّل داخل التطبيق ويعود مع كل فتح/تحميل جديد ما دام التثبيت ممكنًا.
 * فوق أزرار الزوايا العائمة (bottom-7، بارتفاع ≤60px) فلا يتداخل معها، وتحت درج
 * القائمة والألواح المنبثقة (z-20).
 */
export function PWAInstallFloating() {
  const { installable, installing, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!installable || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-20 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white p-1 shadow-[0_10px_24px_rgba(4,120,87,0.25)]">
        <button
          type="button"
          onClick={install}
          disabled={installing}
          className={`inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          تثبيت التطبيق
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="إخفاء زرّ التثبيت"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 ${focusRing}`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

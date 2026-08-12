"use client";

import { useEffect, useState } from "react";
import {
  LYRICS_SCALE_CSS_VAR,
  LYRICS_SCALE_DEFAULT,
  LYRICS_SCALE_MAX,
  LYRICS_SCALE_MIN,
  LYRICS_SCALE_STORAGE_KEY,
  clampLyricsScale,
  readStoredLyricsScale,
  stepLyricsScale,
} from "@/lib/lyrics-font";
import { focusRing } from "@/lib/ui";

// ─────────────────────────────────────────────────────────────────────────────
// متحكّم حجم خط الأناشيد: زرّا تصغير/تكبير (A− / A+) + إعادة للحجم الافتراضي.
// الاختيار عالميّ (متغيّر CSS على جذر الصفحة + حفظ في localStorage) فيُطبَّق على كل
// أماكن القراءة ويبقى ثابتًا عبر الأناشيد والجلسات. سكربت منع الوميض في layout يضبط
// المتغيّر مبكرًا؛ وهذا المكوّن يزامن الحالة بعد التركيب.
// ─────────────────────────────────────────────────────────────────────────────

function applyScale(scale: number) {
  document.documentElement.style.setProperty(LYRICS_SCALE_CSS_VAR, String(scale));
}

function persistScale(scale: number) {
  try {
    localStorage.setItem(LYRICS_SCALE_STORAGE_KEY, String(scale));
  } catch {
    // قد يكون التخزين معطّلًا (تصفّح خاص) — نُبقي التغيير للجلسة الحالية فقط.
  }
}

export function LyricsFontControls({ className = "" }: { className?: string }) {
  const [scale, setScale] = useState(LYRICS_SCALE_DEFAULT);

  // زامِن مع القيمة المحفوظة بعد التركيب (تفاديًا لاختلاف الخادم/العميل).
  useEffect(() => {
    setScale(readStoredLyricsScale());
  }, []);

  const update = (next: number) => {
    const clamped = clampLyricsScale(next);
    setScale(clamped);
    applyScale(clamped);
    persistScale(clamped);
  };

  const atMin = scale <= LYRICS_SCALE_MIN;
  const atMax = scale >= LYRICS_SCALE_MAX;
  const percent = Math.round(scale * 100);
  const isDefault = scale === LYRICS_SCALE_DEFAULT;

  const btnCls =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-neutral-300 bg-white leading-none text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 " +
    focusRing;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="group"
      aria-label="حجم خط النشيد"
    >
      <span className="ml-1 text-xs font-medium text-neutral-500">حجم الخط</span>
      <button
        type="button"
        className={`${btnCls} px-2.5 text-sm font-bold`}
        onClick={() => update(stepLyricsScale(scale, -1))}
        disabled={atMin}
        aria-label="تصغير حجم الخط"
        title="تصغير حجم الخط"
      >
        <span aria-hidden="true">
          A<span className="text-[0.7em] font-bold">−</span>
        </span>
      </button>
      <span
        className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-neutral-600"
        aria-live="polite"
      >
        {percent}٪
      </span>
      <button
        type="button"
        className={`${btnCls} px-2.5 text-base font-bold`}
        onClick={() => update(stepLyricsScale(scale, 1))}
        disabled={atMax}
        aria-label="تكبير حجم الخط"
        title="تكبير حجم الخط"
      >
        <span aria-hidden="true">
          A<span className="text-[0.7em] font-bold">+</span>
        </span>
      </button>
      <button
        type="button"
        className={`${btnCls} px-2.5 text-xs font-medium text-emerald-700`}
        onClick={() => update(LYRICS_SCALE_DEFAULT)}
        disabled={isDefault}
        aria-label="إعادة حجم الخط الافتراضي"
        title="إعادة الحجم الافتراضي"
      >
        إعادة
      </button>
    </div>
  );
}

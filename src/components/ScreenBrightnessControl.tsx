"use client";

import { useEffect, useState } from "react";
import { Sun, SunDim } from "lucide-react";
import {
  BRIGHTNESS_DEFAULT,
  BRIGHTNESS_DIM_CSS_VAR,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  BRIGHTNESS_STEP,
  BRIGHTNESS_STORAGE_KEY,
  brightnessToDim,
  clampBrightness,
  readStoredBrightness,
} from "@/lib/brightness";
import { focusRing } from "@/lib/ui";

// ─────────────────────────────────────────────────────────────────────────────
// متحكّم سطوع الشاشة لصفحة عرض الوصلة: شريط تمرير يخفّف سطوع الصفحة بطبقة تعتيم سوداء
// فوق كامل الشاشة (لا تحجب اللمس). الاختيار عالميّ (متغيّر CSS على جذر الصفحة + حفظ في
// localStorage) ويبقى ثابتًا عبر الجلسات. سكربت منع الوميض في layout يضبطه مبكرًا؛
// وهذا المكوّن يزامن الحالة بعد التركيب ويرسم طبقة التعتيم.
// ─────────────────────────────────────────────────────────────────────────────

function applyBrightness(brightness: number) {
  document.documentElement.style.setProperty(BRIGHTNESS_DIM_CSS_VAR, String(brightnessToDim(brightness)));
}

function persistBrightness(brightness: number) {
  try {
    localStorage.setItem(BRIGHTNESS_STORAGE_KEY, String(brightness));
  } catch {
    // قد يكون التخزين معطّلًا (تصفّح خاص) — نُبقي التغيير للجلسة الحالية فقط.
  }
}

export function ScreenBrightnessControl({ className = "" }: { className?: string }) {
  const [brightness, setBrightness] = useState(BRIGHTNESS_DEFAULT);

  // زامِن مع القيمة المحفوظة بعد التركيب (تفاديًا لاختلاف الخادم/العميل).
  useEffect(() => {
    setBrightness(readStoredBrightness());
  }, []);

  const update = (next: number) => {
    const clamped = clampBrightness(next);
    setBrightness(clamped);
    applyBrightness(clamped);
    persistBrightness(clamped);
  };

  const percent = Math.round(brightness * 100);

  return (
    <>
      {/* طبقة التعتيم فوق كامل الشاشة — لا تحجب اللمس ولا تُقرأ بقارئ الشاشة. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40 bg-black transition-opacity"
        style={{ opacity: `var(${BRIGHTNESS_DIM_CSS_VAR}, 0)` }}
      />

      <div
        className={`inline-flex items-center gap-2 ${className}`}
        role="group"
        aria-label="سطوع الشاشة"
      >
        <SunDim className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
        <input
          type="range"
          min={BRIGHTNESS_MIN}
          max={BRIGHTNESS_MAX}
          step={BRIGHTNESS_STEP}
          value={brightness}
          onChange={(e) => update(parseFloat(e.target.value))}
          aria-label="سطوع الشاشة"
          aria-valuetext={`${percent}٪`}
          title="سطوع الشاشة"
          className={`h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-emerald-700 ${focusRing}`}
        />
        <Sun className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
        <span
          className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-neutral-600"
          aria-live="polite"
        >
          {percent}٪
        </span>
      </div>
    </>
  );
}

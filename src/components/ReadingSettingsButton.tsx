"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ReaderTypeSheet } from "@/components/ReaderTypeSheet";
import { LYRICS_SCALE_DEFAULT, LYRICS_SCALE_EVENT, readStoredLyricsScale, setLyricsScale } from "@/lib/lyrics-font";
import {
  LINE_SPACING_DEFAULT,
  persistLineSpacing,
  readStoredLineSpacing,
  type LineSpacing,
} from "@/lib/lyrics-reading-prefs";
import { setSiteTheme } from "@/lib/theme";
import { useSiteTheme } from "@/lib/use-site-theme";
import { useKeepScreenAwake } from "@/lib/use-keep-screen-awake";
import { focusRing } from "@/lib/ui";

// ─────────────────────────────────────────────────────────────────────────────
// ضبط القراءة — مصدر واحد لصفحة كلمات الأنشودة وصفحة قراءة الوصلة:
// • useReadingPrefs: حجم الخط وتباعد الأسطر المحفوظان على الجهاز. حجم الخط عالمي
//   (متغيّر CSS ‎--lyrics-scale‎) فيُطبَّق على كل نصوص الأناشيد؛ تباعد الأسطر يقرؤه
//   من يعرض النص ويطبّقه.
// • ReadingSettingsButton: زر الأيقونة + لوح الضبط (حجم الخط، تباعد الأسطر، المظهر،
//   إبقاء الشاشة مضاءة).
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadingPrefs {
  scale: number;
  setScale: (next: number) => void;
  lineSpacing: LineSpacing;
  setLineSpacing: (next: LineSpacing) => void;
}

export function useReadingPrefs(): ReadingPrefs {
  const [scale, setScaleState] = useState(LYRICS_SCALE_DEFAULT);
  const [lineSpacing, setLineSpacingState] = useState<LineSpacing>(LINE_SPACING_DEFAULT);

  useEffect(() => {
    setScaleState(readStoredLyricsScale());
    setLineSpacingState(readStoredLineSpacing());
    // تغيّر الحجم من مصدر آخر (حركة الإصبعين على النص) يُحدّث مؤشّر اللوح.
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setScaleState(detail);
    };
    window.addEventListener(LYRICS_SCALE_EVENT, onChange);
    return () => window.removeEventListener(LYRICS_SCALE_EVENT, onChange);
  }, []);

  return {
    scale,
    setScale: (next) => setScaleState(setLyricsScale(next)),
    lineSpacing,
    setLineSpacing: (next) => {
      setLineSpacingState(next);
      persistLineSpacing(next);
    },
  };
}

export const readingSettingsIconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-ink/5 " +
  focusRing;

export function ReadingSettingsButton({
  prefs,
  className = readingSettingsIconBtn,
}: {
  prefs: ReadingPrefs;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const appearance = useSiteTheme();
  const keepAwake = useKeepScreenAwake();

  useEffect(() => setMounted(true), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ضبط القراءة"
        aria-haspopup="dialog"
        title="ضبط القراءة"
        className={className}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 7 4-4 4 4" />
          <path d="M7 3v18" />
          <path d="M21 6h-7" />
          <path d="M21 12h-9" />
          <path d="M21 18h-5" />
        </svg>
      </button>
      {/* بوابة إلى body: الزر قد يكون داخل شريط بـbackdrop-blur، وهذا يحبس العناصر
          الثابتة (fixed) داخله فيظهر اللوح مقصوصًا. */}
      {mounted &&
        createPortal(
          <ReaderTypeSheet
            open={open}
            onClose={() => setOpen(false)}
            scale={prefs.scale}
            onScaleChange={prefs.setScale}
            lineSpacing={prefs.lineSpacing}
            onLineSpacingChange={prefs.setLineSpacing}
            appearance={appearance}
            onAppearanceChange={setSiteTheme}
            keepAwakeSupported={keepAwake.supported}
            keepAwakeEnabled={keepAwake.enabled}
            onToggleKeepAwake={keepAwake.toggle}
          />,
          document.body,
        )}
    </>
  );
}

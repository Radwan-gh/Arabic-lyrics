"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ReaderTypeSheet } from "@/components/ReaderTypeSheet";
import {
  LYRICS_SCALE_DEFAULT,
  readStoredLyricsScale,
  setLyricsScale,
} from "@/lib/lyrics-font";
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

/** تباعد الأسطر المحفوظ على الجهاز، مع دالة تغييره وحفظه. */
export function useLineSpacing(): [LineSpacing, (next: LineSpacing) => void] {
  const [lineSpacing, setLineSpacing] =
    useState<LineSpacing>(LINE_SPACING_DEFAULT);
  useEffect(() => setLineSpacing(readStoredLineSpacing()), []);
  return [
    lineSpacing,
    (next) => {
      setLineSpacing(next);
      persistLineSpacing(next);
    },
  ];
}

export const readingSettingsIconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-ink/5 " +
  focusRing;

/**
 * زر «ضبط القراءة» بأيقونته نفسها في شاشة كلمات الأنشودة، يفتح اللوح ذاته (حجم الخط،
 * تباعد الأسطر، المظهر، إبقاء الشاشة مضاءة). حجم الخط عالمي (متغيّر CSS) فيُطبَّق على
 * كل نصوص الأناشيد في الصفحة مباشرة؛ تباعد الأسطر يمرَّر لمن يملك الحالة.
 */
export function ReadingSettingsButton({
  lineSpacing,
  onLineSpacingChange,
  className = readingSettingsIconBtn,
}: {
  lineSpacing: LineSpacing;
  onLineSpacingChange: (next: LineSpacing) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(LYRICS_SCALE_DEFAULT);
  const appearance = useSiteTheme();
  const keepAwake = useKeepScreenAwake();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setScale(readStoredLyricsScale());
    setMounted(true);
  }, []);

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
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
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
            scale={scale}
            onScaleChange={(next) => setScale(setLyricsScale(next))}
            lineSpacing={lineSpacing}
            onLineSpacingChange={onLineSpacingChange}
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

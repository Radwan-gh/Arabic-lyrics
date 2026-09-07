"use client";

import { useEffect } from "react";
import { LYRICS_SCALE_LEVELS } from "@/lib/lyrics-font";
import {
  LINE_SPACING_LEVELS,
  LINE_SPACING_LABELS,
  READING_APPEARANCES,
  READING_APPEARANCE_LABELS,
  type LineSpacing,
  type ReadingAppearance,
} from "@/lib/lyrics-reading-prefs";
import { focusRing } from "@/lib/ui";

interface ReaderTypeSheetProps {
  open: boolean;
  onClose: () => void;
  scale: number;
  onScaleChange: (next: number) => void;
  lineSpacing: LineSpacing;
  onLineSpacingChange: (next: LineSpacing) => void;
  appearance: ReadingAppearance;
  onAppearanceChange: (next: ReadingAppearance) => void;
  keepAwakeSupported: boolean;
  keepAwakeEnabled: boolean;
  onToggleKeepAwake: () => void;
}

const segmentBtn =
  "flex-1 inline-flex h-12 items-center justify-center rounded-2xl text-sm transition-colors " + focusRing;

/**
 * لوح منبثق (bottom sheet) لضبط تجربة القراءة على الموبايل: حجم الخط (٦ مستويات)،
 * تباعد الأسطر، المظهر، وإبقاء الشاشة مضاءة. يُفتح من شريط أدوات شاشة القراءة الغامرة
 * ومن وضع الأداء.
 */
export function ReaderTypeSheet({
  open,
  onClose,
  scale,
  onScaleChange,
  lineSpacing,
  onLineSpacingChange,
  appearance,
  onAppearanceChange,
  keepAwakeSupported,
  keepAwakeEnabled,
  onToggleKeepAwake,
}: ReaderTypeSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const levelIndex = Math.max(0, LYRICS_SCALE_LEVELS.indexOf(scale as (typeof LYRICS_SCALE_LEVELS)[number]));

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ضبط القراءة">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-[#14211c]/30"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-5 overflow-y-auto rounded-t-3xl bg-white px-6 pb-8 pt-2.5 shadow-2xl">
        <span aria-hidden="true" className="mx-auto h-1.5 w-11 rounded-full bg-neutral-200" />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold text-[#14211c]">حجم الخط</span>
            <span className="text-sm text-neutral-500">
              {levelIndex + 1} / {LYRICS_SCALE_LEVELS.length}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onScaleChange(LYRICS_SCALE_LEVELS[Math.max(0, levelIndex - 1)])}
              disabled={levelIndex === 0}
              aria-label="تصغير حجم الخط"
              className={`shrink-0 text-sm text-neutral-500 disabled:opacity-40 ${focusRing}`}
            >
              أ
            </button>
            <div className="flex flex-1 gap-1.5" role="group" aria-label="مستوى حجم الخط">
              {LYRICS_SCALE_LEVELS.map((level, i) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onScaleChange(level)}
                  aria-label={`المستوى ${i + 1}`}
                  aria-pressed={i === levelIndex}
                  className={`h-2 flex-1 rounded-full ${i <= levelIndex ? "bg-emerald-700" : "bg-neutral-200"} ${focusRing}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onScaleChange(LYRICS_SCALE_LEVELS[Math.min(LYRICS_SCALE_LEVELS.length - 1, levelIndex + 1)])}
              disabled={levelIndex === LYRICS_SCALE_LEVELS.length - 1}
              aria-label="تكبير حجم الخط"
              className={`shrink-0 text-2xl font-bold text-[#14211c] disabled:opacity-40 ${focusRing}`}
            >
              أ
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-[15px] font-bold text-[#14211c]">تباعد الأسطر</span>
          <div className="flex gap-2" role="group" aria-label="تباعد الأسطر">
            {LINE_SPACING_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onLineSpacingChange(level)}
                aria-pressed={level === lineSpacing}
                className={`${segmentBtn} ${
                  level === lineSpacing ? "bg-emerald-700 font-semibold text-white" : "bg-[#f2f2ee] text-[#3c4a44]"
                }`}
              >
                {LINE_SPACING_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-[15px] font-bold text-[#14211c]">المظهر</span>
          <div className="flex gap-2" role="group" aria-label="مظهر القراءة">
            {READING_APPEARANCES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onAppearanceChange(value)}
                aria-pressed={value === appearance}
                className={`${segmentBtn} ${
                  value === appearance ? "bg-emerald-700 font-semibold text-white" : "bg-[#f2f2ee] text-[#3c4a44]"
                }`}
              >
                {READING_APPEARANCE_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {keepAwakeSupported && (
          <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#14211c]">إبقاء الشاشة مضاءة</span>
              <span className="text-[13px] text-neutral-500">أثناء الأداء</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={keepAwakeEnabled}
              aria-label="إبقاء الشاشة مضاءة أثناء الأداء"
              onClick={onToggleKeepAwake}
              className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${keepAwakeEnabled ? "bg-emerald-700" : "bg-neutral-200"} ${focusRing}`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-[3px] h-[26px] w-[26px] rounded-full bg-white transition-[inset-inline-start] ${keepAwakeEnabled ? "start-[23px]" : "start-[3px]"}`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

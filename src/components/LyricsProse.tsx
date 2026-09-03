"use client";

import { useEffect, useRef } from "react";
import { lyricsProseCls } from "@/lib/lyrics-prose";
import {
  persistLyricsScale,
  readStoredLyricsScale,
  setLyricsScale,
} from "@/lib/lyrics-font";

// ─────────────────────────────────────────────────────────────────────────────
// حاوية نصّ النشيد: تعرض المحتوى المُصيَّر وتدعم تكبير/تصغير الخط بحركة الإصبعين
// (pinch) على الموبايل. الحركة تتحكّم بنفس مُعامِل التكبير العالمي (--lyrics-scale)
// الذي تضبطه أزرار الحجم، فتبقى الاثنتان متزامنتين وتُحفظ القيمة عبر الجلسات.
//
// `touch-action: pan-y` يُبقي التمرير العمودي بإصبع واحد ويُعطّل زوم المتصفّح
// الطبيعي داخل الحاوية فقط، لنتولّى نحن حركة الإصبعين؛ بقيّة الصفحة تبقى بزومها.
// ─────────────────────────────────────────────────────────────────────────────

function touchDistance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function LyricsProse({ html, className = "" }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let active = false;
    let startDist = 0;
    let startScale = 1;
    let current = 1;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      active = true;
      startDist = touchDistance(e.touches[0], e.touches[1]);
      startScale = readStoredLyricsScale();
      current = startScale;
      e.preventDefault();
    };

    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 2 || startDist === 0) return;
      e.preventDefault();
      const ratio = touchDistance(e.touches[0], e.touches[1]) / startDist;
      // تحديث حيّ بلا حفظ (نحفظ القيمة النهائية عند نهاية الحركة).
      current = setLyricsScale(startScale * ratio, false);
    };

    const onEnd = (e: TouchEvent) => {
      if (!active || e.touches.length >= 2) return;
      active = false;
      persistLyricsScale(current);
    };

    // مستمعات غير خاملة (passive:false) ليعمل preventDefault ويُوقف زوم المتصفّح.
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return (
    <div
      ref={ref}
      dir="rtl"
      className={`${className} ${lyricsProseCls}`.trim()}
      style={{ touchAction: "pan-y" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

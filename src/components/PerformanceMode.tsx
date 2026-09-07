"use client";

import { X } from "lucide-react";
import { LINE_SPACING_CLS, type LineSpacing } from "@/lib/lyrics-reading-prefs";
import { lyricsProseFormatCls } from "@/lib/lyrics-prose";
import { focusRing } from "@/lib/ui";

interface PlaylistNavContext {
  title: string;
  position: number;
  total: number;
  prevTitle: string | null;
  nextTitle: string | null;
}

interface PerformanceModeProps {
  title: string;
  artist: string | null;
  contentHtml: string;
  scale: number;
  lineSpacing: LineSpacing;
  onClose: () => void;
  playlist: PlaylistNavContext | null;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
}

/**
 * وضع الأداء: شاشة قراءة غامرة داكنة بلا زخرفة — نصّ كبير، إبقاء الشاشة مضاءة
 * (يُطلَب تلقائيًا طالما الوضع مفتوح)، وتنقّل بالسحب داخل الوصلة إن وُجد سياقها.
 */
export function PerformanceMode({
  title,
  artist,
  contentHtml,
  scale,
  lineSpacing,
  onClose,
  playlist,
  onSwipePrev,
  onSwipeNext,
}: PerformanceModeProps) {
  let touchStartX: number | null = null;

  function onTouchStart(e: React.TouchEvent) {
    touchStartX = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX;
    const dx = endX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 48) return;
    // RTL: سحب لليمين (dx > 0) = التالي، لليسار = السابق — يطابق اتجاه القراءة.
    if (dx > 0) onSwipeNext();
    else onSwipePrev();
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col bg-[#0e1613] text-[#f2f5f3]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] text-[#8fd8bb]">
          وضع الأداء · الشاشة مضاءة
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق وضع الأداء"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#8b9a94] hover:bg-white/5 ${focusRing}`}
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="text-base text-[#8b9a94]">
          {title}
          {artist ? ` · ${artist}` : ""}
        </div>
        <div
          className={`mt-6 font-medium ${LINE_SPACING_CLS[lineSpacing]} ${lyricsProseFormatCls}`}
          style={{ fontSize: `calc(1.8125rem * ${scale})` }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      {playlist && (
        <div className="flex items-center justify-between px-6 pb-6 text-sm text-[#6d7d76]">
          <span>
            {playlist.title} · {toArabicOrdinal(playlist.position)} من {toArabicOrdinal(playlist.total)}
          </span>
          {playlist.nextTitle && <span>التالي: {playlist.nextTitle} ←</span>}
        </div>
      )}
    </div>
  );
}

function toArabicOrdinal(n: number): string {
  return n.toLocaleString("ar-EG");
}

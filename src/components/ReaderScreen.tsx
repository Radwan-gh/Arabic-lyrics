"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronLeft, MoreVertical, Moon, Pencil } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToPlaylist } from "@/components/AddToPlaylist";
import { ShareLyrics } from "@/components/ShareLyrics";
import { ExportLyricsImage } from "@/components/ExportLyricsImage";
import { DeleteLyricsButton } from "@/components/DeleteLyricsButton";
import { ReaderTypeSheet } from "@/components/ReaderTypeSheet";
import { PerformanceMode } from "@/components/PerformanceMode";
import { MenuButton } from "@/components/MenuButton";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";
import { useOfflineLyricsDetail, type ReaderSsrData } from "@/hooks/use-offline-lyrics-detail";
import { lyricsProseFormatCls } from "@/lib/lyrics-prose";
import { LYRICS_SCALE_DEFAULT, readStoredLyricsScale, setLyricsScale } from "@/lib/lyrics-font";
import {
  LINE_SPACING_CLS,
  LINE_SPACING_DEFAULT,
  READING_APPEARANCE_CLS,
  READING_APPEARANCE_DEFAULT,
  readStoredLineSpacing,
  readStoredReadingAppearance,
  persistLineSpacing,
  persistReadingAppearance,
  type LineSpacing,
  type ReadingAppearance,
} from "@/lib/lyrics-reading-prefs";
import { useKeepScreenAwake } from "@/lib/use-keep-screen-awake";
import { focusRing } from "@/lib/ui";

const iconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-[#3c4a44] transition-colors hover:bg-black/5 " +
  focusRing;

/**
 * شاشة القراءة الغامرة على الموبايل: كروم أدنى، تنقّل بالسحب داخل الوصلة (إن
 * وُجد سياقها)، لوح ضبط القراءة، ووضع الأداء. سطح المكتب يبقى على التخطيط
 * التقليدي في page.tsx (هذا المكوّن مخفي هناك بـ`sm:hidden`).
 */
export function ReaderScreen({ ssr, id }: { ssr: ReaderSsrData | null; id: string }) {
  const { view, online, found, sourcedFromCache } = useOfflineLyricsDetail(ssr, id);
  const router = useRouter();
  const [scale, setScale] = useState(LYRICS_SCALE_DEFAULT);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>(LINE_SPACING_DEFAULT);
  const [appearance, setAppearance] = useState<ReadingAppearance>(READING_APPEARANCE_DEFAULT);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const keepAwake = useKeepScreenAwake();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setScale(readStoredLyricsScale());
    setLineSpacing(readStoredLineSpacing());
    setAppearance(readStoredReadingAppearance());
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (moreOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  function goTo(targetId: string | null) {
    if (!targetId || !view?.playlist) return;
    router.push(`/lyrics/${targetId}?playlist=${view.playlist.playlistId}`);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || !view?.playlist) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    // RTL: سحب لليمين (dx > 0) = التالي، لليسار = السابق.
    if (dx > 0) goTo(view.playlist.nextId);
    else goTo(view.playlist.prevId);
  }

  function updateScale(next: number) {
    setScale(setLyricsScale(next));
  }
  function updateLineSpacing(next: LineSpacing) {
    setLineSpacing(next);
    persistLineSpacing(next);
  }
  function updateAppearance(next: ReadingAppearance) {
    setAppearance(next);
    persistReadingAppearance(next);
  }

  if (!found || !view) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 p-6">
        <header className="flex items-center gap-1">
          <button type="button" onClick={() => router.back()} aria-label="رجوع" className={iconBtn}>
            <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
          <MenuButton className={iconBtn} />
        </header>
        <OfflineEmptyState>
          هذه الأنشودة غير محفوظة على جهازك. اتصل بالإنترنت لعرضها، أو عُد إلى المجموعة المحفوظة.
          <span className="mt-3 block">
            <Link href="/" className={`font-medium text-emerald-700 hover:underline ${focusRing}`}>
              ▸ المجموعة المحفوظة
            </Link>
          </span>
        </OfflineEmptyState>
      </div>
    );
  }

  const editHref = `/lyrics/${view.lyricsId}/edit`;

  if (performanceMode) {
    return (
      <PerformanceMode
        title={view.title}
        artist={view.artist}
        contentHtml={view.contentHtml}
        scale={scale}
        lineSpacing={lineSpacing}
        onClose={() => setPerformanceMode(false)}
        playlist={
          view.playlist
            ? {
                title: view.playlist.playlistTitle,
                position: view.playlist.position,
                total: view.playlist.total,
                prevTitle: view.playlist.prevTitle,
                nextTitle: view.playlist.nextTitle,
              }
            : null
        }
        onSwipePrev={() => goTo(view.playlist?.prevId ?? null)}
        onSwipeNext={() => goTo(view.playlist?.nextId ?? null)}
      />
    );
  }

  return (
    <div className={`flex min-h-dvh flex-col ${READING_APPEARANCE_CLS[appearance]}`}>
      <header className="flex items-center gap-1 px-3 py-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={iconBtn}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <MenuButton className={iconBtn} />
        <div className="flex-1" />
        {view.loggedIn && online && (
          <FavoriteButton lyricsId={view.lyricsId} initialFavorited={view.favorited} variant="plain" key={view.lyricsId} />
        )}
        {view.loggedIn && online && <AddToPlaylist lyricsId={view.lyricsId} variant="plain" />}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-label="المزيد"
            className={iconBtn}
          >
            <MoreVertical className="h-[21px] w-[21px]" aria-hidden="true" />
          </button>
          {moreOpen && (
            <div
              role="menu"
              className="absolute end-0 top-full z-10 mt-1 flex w-56 flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg"
            >
              <ShareLyrics shareUrl={view.shareUrl} title={view.title} shareText={view.shareText} />
              <ExportLyricsImage
                title={view.title}
                artist={view.artist}
                album={view.album}
                contentHtml={view.contentHtml}
                tags={view.tags}
                siteLabel={view.siteLabel}
              />
              {view.canModify && (
                <>
                  <Link
                    href={editHref}
                    aria-label="تعديل"
                    title="تعديل"
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 ${focusRing}`}
                  >
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                  </Link>
                  <DeleteLyricsButton id={view.lyricsId} />
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {!online && (
        <div className="px-6 pb-2">
          <OfflineBanner online={online} sourcedFromCache={sourcedFromCache} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-4 pt-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <h1 className="font-naskh text-[30px] font-extrabold leading-[1.35]">{view.title}</h1>
        <div className="mt-1.5 text-[15px] text-[#6b7670]">
          {[view.artist, view.album, view.viewCount > 0 ? `${view.viewCount.toLocaleString("ar-EG")} قراءة` : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {view.tags.length > 0 && (
          <div className="mt-[14px] flex flex-wrap gap-2">
            {view.tags.map((tag) => (
              <Link
                key={tag}
                href={`/?tags=${encodeURIComponent(tag)}`}
                className={`inline-flex h-[30px] items-center rounded-full border border-[#e6e6e1] bg-white px-3 text-[13px] text-[#5c6660] ${focusRing}`}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        <div
          className={`mt-[22px] ${lyricsProseFormatCls} ${LINE_SPACING_CLS[lineSpacing]}`}
          style={{ fontSize: `calc(1.4375rem * ${scale})` }}
          dangerouslySetInnerHTML={{ __html: view.contentHtml }}
        />
      </div>

      <div className="px-3 pb-5 pt-2">
        <div className="flex items-center justify-between gap-2 rounded-[18px] border border-[#e6e6e1] bg-white p-1.5">
          <button
            type="button"
            onClick={() => goTo(view.playlist?.prevId ?? null)}
            disabled={!view.playlist?.prevId}
            aria-label="النشيد السابق"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] disabled:opacity-30 ${focusRing}`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="ضبط القراءة"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#14211c] ${focusRing}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m3 7 4-4 4 4" />
              <path d="M7 3v18" />
              <path d="M21 6h-7" />
              <path d="M21 12h-9" />
              <path d="M21 18h-5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPerformanceMode(true)}
            className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-[#ecfdf5] px-4 text-[15px] font-semibold text-emerald-700 ${focusRing}`}
          >
            <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
            وضع الأداء
          </button>
          <button
            type="button"
            onClick={() => goTo(view.playlist?.nextId ?? null)}
            disabled={!view.playlist?.nextId}
            aria-label="النشيد التالي"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] disabled:opacity-30 ${focusRing}`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {view.playlist && (
          <p className="mt-2 text-center text-xs text-[#8a938d]">
            اسحب يميناً أو يساراً للتنقل داخل الوصلة · {view.playlist.position.toLocaleString("ar-EG")} من{" "}
            {view.playlist.total.toLocaleString("ar-EG")}
          </p>
        )}
      </div>

      <ReaderTypeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        scale={scale}
        onScaleChange={updateScale}
        lineSpacing={lineSpacing}
        onLineSpacingChange={updateLineSpacing}
        appearance={appearance}
        onAppearanceChange={updateAppearance}
        keepAwakeSupported={keepAwake.supported}
        keepAwakeEnabled={keepAwake.enabled}
        onToggleKeepAwake={keepAwake.toggle}
      />
    </div>
  );
}

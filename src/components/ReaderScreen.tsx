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
import type { PlaylistNavContext } from "@/lib/playlists";

interface ReaderScreenProps {
  lyricsId: string;
  title: string;
  artist: string | null;
  album: string | null;
  viewCount: number;
  tags: string[];
  contentHtml: string;
  favorited: boolean;
  loggedIn: boolean;
  canModify: boolean;
  shareUrl: string;
  shareText: string;
  siteLabel?: string;
  playlist: PlaylistNavContext | null;
}

const iconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-[#3c4a44] transition-colors hover:bg-black/5 " +
  focusRing;

/**
 * شاشة القراءة الغامرة على الموبايل: كروم أدنى، تنقّل بالسحب داخل الوصلة (إن
 * وُجد سياقها)، لوح ضبط القراءة، ووضع الأداء. سطح المكتب يبقى على التخطيط
 * التقليدي في page.tsx (هذا المكوّن مخفي هناك بـ`sm:hidden`).
 */
export function ReaderScreen({
  lyricsId,
  title,
  artist,
  album,
  viewCount,
  tags,
  contentHtml,
  favorited,
  loggedIn,
  canModify,
  shareUrl,
  shareText,
  siteLabel,
  playlist,
}: ReaderScreenProps) {
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

  function goTo(id: string | null) {
    if (!id || !playlist) return;
    router.push(`/lyrics/${id}?playlist=${playlist.playlistId}`);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || !playlist) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    // RTL: سحب لليمين (dx > 0) = التالي، لليسار = السابق.
    if (dx > 0) goTo(playlist.nextId);
    else goTo(playlist.prevId);
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

  const editHref = `/lyrics/${lyricsId}/edit`;

  if (performanceMode) {
    return (
      <PerformanceMode
        title={title}
        artist={artist}
        contentHtml={contentHtml}
        scale={scale}
        lineSpacing={lineSpacing}
        onClose={() => setPerformanceMode(false)}
        playlist={
          playlist
            ? {
                title: playlist.playlistTitle,
                position: playlist.position,
                total: playlist.total,
                prevTitle: playlist.prevTitle,
                nextTitle: playlist.nextTitle,
              }
            : null
        }
        onSwipePrev={() => goTo(playlist?.prevId ?? null)}
        onSwipeNext={() => goTo(playlist?.nextId ?? null)}
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
        {loggedIn && (
          <FavoriteButton lyricsId={lyricsId} initialFavorited={favorited} variant="plain" key={lyricsId} />
        )}
        {loggedIn && <AddToPlaylist lyricsId={lyricsId} variant="plain" />}
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
              <ShareLyrics shareUrl={shareUrl} title={title} shareText={shareText} />
              <ExportLyricsImage
                title={title}
                artist={artist}
                album={album}
                contentHtml={contentHtml}
                tags={tags}
                siteLabel={siteLabel}
              />
              {canModify && (
                <>
                  <Link
                    href={editHref}
                    aria-label="تعديل"
                    title="تعديل"
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 ${focusRing}`}
                  >
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                  </Link>
                  <DeleteLyricsButton id={lyricsId} />
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-4 pt-1" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <h1 className="font-naskh text-[30px] font-extrabold leading-[1.35]">{title}</h1>
        <div className="mt-1.5 text-[15px] text-[#6b7670]">
          {[artist, album, viewCount > 0 ? `${viewCount.toLocaleString("ar-EG")} قراءة` : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {tags.length > 0 && (
          <div className="mt-[14px] flex flex-wrap gap-2">
            {tags.map((tag) => (
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
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      <div className="px-3 pb-5 pt-2">
        <div className="flex items-center justify-between gap-2 rounded-[18px] border border-[#e6e6e1] bg-white p-1.5">
          <button
            type="button"
            onClick={() => goTo(playlist?.prevId ?? null)}
            disabled={!playlist?.prevId}
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
            onClick={() => goTo(playlist?.nextId ?? null)}
            disabled={!playlist?.nextId}
            aria-label="النشيد التالي"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] disabled:opacity-30 ${focusRing}`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {playlist && (
          <p className="mt-2 text-center text-xs text-[#8a938d]">
            اسحب يميناً أو يساراً للتنقل داخل الوصلة · {playlist.position.toLocaleString("ar-EG")} من{" "}
            {playlist.total.toLocaleString("ar-EG")}
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

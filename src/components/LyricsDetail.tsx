"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { DeleteLyricsButton } from "@/components/DeleteLyricsButton";
import { AddToPlaylist } from "@/components/AddToPlaylist";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareLyrics } from "@/components/ShareLyrics";
import { ExportLyricsImage } from "@/components/ExportLyricsImage";
import { LyricsFontControls } from "@/components/LyricsFontControls";
import { LyricsProse } from "@/components/LyricsProse";
import { KeepScreenAwake } from "@/components/KeepScreenAwake";
import { ReaderScreen } from "@/components/ReaderScreen";
import { OfflinePageFallback } from "@/components/OfflinePageFallback";
import { LyricsDetailSkeleton } from "@/components/LyricsDetailSkeleton";
import { formatDate } from "@/lib/format";
import { btnSecondary, focusRing } from "@/lib/ui";
import { buildWhatsAppLyricsFromHtml } from "@/lib/whatsapp-text";
import { useOfflinePageData, type OfflineDataset } from "@/lib/offline-data";
import type { PlaylistNavContext } from "@/lib/playlists";
import { canModifyLyrics, type LyricsViewer } from "@/lib/lyrics-permissions";

export interface LyricsDetailData {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  viewCount: number;
  tags: string[];
  contentHtml: string;
  /** ISO string. */
  createdAt: string;
  createdByName: string | null;
  favorited: boolean;
  canModify: boolean;
  shareUrl: string;
  shareText: string;
  siteLabel?: string;
  playlist: PlaylistNavContext | null;
}

/**
 * صفحة النشيد: متصلةً يمرّر الخادم `data`؛ ودون اتصال (هيكل بلا بيانات) تُحسب من
 * بيانات الجهاز حسب الرابط الفعلي (‎/lyrics/<id>?playlist=…‎).
 */
export function LyricsDetail({
  data,
  loggedIn,
  viewer,
}: {
  data: LyricsDetailData | null;
  loggedIn: boolean;
  viewer: LyricsViewer | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = decodeURIComponent(pathname.split("/")[2] ?? "");
  const playlistId = searchParams.get("playlist");
  const state = useOfflinePageData(
    data,
    (dataset) => selectLyricDetail(dataset, id, playlistId, viewer),
    `${id}|${playlistId}`,
  );
  if (state.status === "loading") return <LyricsDetailSkeleton />;
  if (state.status === "missing") return <OfflinePageFallback status="missing" />;
  return <LyricsDetailView key={state.data.id} data={state.data} loggedIn={loggedIn} />;
}

function selectLyricDetail(
  dataset: OfflineDataset,
  id: string,
  playlistId: string | null,
  viewer: LyricsViewer | null,
): LyricsDetailData | null {
  const lyric = dataset.byId.get(id);
  if (!lyric) return null;
  return {
    id: lyric.id,
    title: lyric.title,
    artist: lyric.artist,
    album: lyric.album,
    viewCount: lyric.viewCount,
    tags: lyric.tags,
    contentHtml: lyric.contentHtml,
    createdAt: lyric.createdAt,
    createdByName: lyric.createdByName,
    favorited: dataset.favoriteIds.has(lyric.id),
    canModify: canModifyLyrics(viewer, lyric.createdById),
    shareUrl: `${window.location.origin}/lyrics/${lyric.id}`,
    shareText: buildWhatsAppLyricsFromHtml({ title: lyric.title, artist: lyric.artist, html: lyric.contentHtml, tags: lyric.tags }),
    siteLabel: window.location.host,
    playlist: playlistId ? selectPlaylistNav(dataset, playlistId, lyric.id) : null,
  };
}

// يطابق getPlaylistNavContext على الخادم، لوصلات المستخدم المحفوظة على الجهاز.
function selectPlaylistNav(dataset: OfflineDataset, playlistId: string, lyricsId: string): PlaylistNavContext | null {
  const playlist = dataset.me?.playlists.find((p) => p.id === playlistId);
  if (!playlist) return null;
  const index = playlist.itemIds.indexOf(lyricsId);
  if (index === -1) return null;
  const prevId = index > 0 ? playlist.itemIds[index - 1] : null;
  const nextId = index < playlist.itemIds.length - 1 ? playlist.itemIds[index + 1] : null;
  return {
    playlistId: playlist.id,
    playlistTitle: playlist.title,
    position: index + 1,
    total: playlist.itemIds.length,
    prevId,
    prevTitle: prevId ? (dataset.byId.get(prevId)?.title ?? null) : null,
    nextId,
    nextTitle: nextId ? (dataset.byId.get(nextId)?.title ?? null) : null,
  };
}

function LyricsDetailView({ data, loggedIn }: { data: LyricsDetailData; loggedIn: boolean }) {
  return (
    <>
      {/* الموبايل: شاشة قراءة غامرة (كروم أدنى، تنقّل بالسحب). سطح المكتب يبقى كما هو أدناه. */}
      <div className="sm:hidden">
        <ReaderScreen
          lyricsId={data.id}
          title={data.title}
          artist={data.artist}
          album={data.album}
          viewCount={data.viewCount}
          tags={data.tags}
          contentHtml={data.contentHtml}
          favorited={data.favorited}
          loggedIn={loggedIn}
          canModify={data.canModify}
          shareUrl={data.shareUrl}
          shareText={data.shareText}
          siteLabel={data.siteLabel}
          playlist={data.playlist}
        />
      </div>

      <article className="hidden rounded-xl border border-neutral-200 bg-white px-3 py-5 shadow-sm sm:block sm:p-6">
      <header className="mb-4 flex flex-col gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold font-naskh">{data.title}</h1>
          {data.artist && <p className="text-emerald-700">{data.artist}</p>}
          {data.album && <p className="text-sm text-neutral-500">{data.album}</p>}
          <p className="text-xs text-neutral-500">
            أضافها {data.createdByName ?? "مستخدم محذوف"} · {formatDate(new Date(data.createdAt))} · {data.viewCount} مشاهدة
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {loggedIn && <FavoriteButton lyricsId={data.id} initialFavorited={data.favorited} />}
          <ShareLyrics shareUrl={data.shareUrl} title={data.title} shareText={data.shareText} />
          <ExportLyricsImage
            title={data.title}
            artist={data.artist}
            album={data.album}
            contentHtml={data.contentHtml}
            tags={data.tags}
            siteLabel={data.siteLabel}
          />
          {loggedIn && <AddToPlaylist lyricsId={data.id} />}
          {data.canModify && (
            <>
              <span aria-hidden="true" className="mx-1 h-6 w-px self-center bg-neutral-200" />
              <Link
                href={`/lyrics/${data.id}/edit`}
                className={`${btnSecondary} h-11 w-11 !p-0`}
                aria-label="تعديل"
                title="تعديل"
              >
                <Pencil className="h-6 w-6" aria-hidden="true" />
              </Link>
              <DeleteLyricsButton id={data.id} />
            </>
          )}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <KeepScreenAwake />
        <LyricsFontControls />
      </div>

      <LyricsProse html={data.contentHtml} />

      {data.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?tags=${encodeURIComponent(tag)}`}
              className={`rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200 ${focusRing}`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
      </article>
    </>
  );
}

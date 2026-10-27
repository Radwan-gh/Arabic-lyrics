"use client";

import { usePathname } from "next/navigation";
import { PlaylistsView } from "@/components/PlaylistsView";
import { PlaylistsScreen } from "@/components/PlaylistsScreen";
import { PlaylistDetailView } from "@/components/PlaylistDetailView";
import { PlaylistDetailScreen } from "@/components/PlaylistDetailScreen";
import { PlaylistReadView } from "@/components/PlaylistReadView";
import { OfflinePageFallback } from "@/components/OfflinePageFallback";
import { useOfflinePageData, type OfflineDataset } from "@/lib/offline-data";
import type { OfflineLyric, OfflinePlaylist } from "@/lib/offline";

// صفحات الوصلات: متصلةً يمرّر الخادم بياناتها؛ ودون اتصال (هيكل بلا بيانات) تُحسب
// من وصلات المستخدم وأناشيده المحفوظة على الجهاز، حسب الرابط الفعلي.

export interface PlaylistSummary {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  /** ISO string. */
  createdAt: string;
  itemCount: number;
}

export interface PlaylistDetailData {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: { lyricsId: string; title: string; artist: string | null; album: string | null }[];
  shareUrl: string;
}

export interface PlaylistReadData {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: { lyricsId: string; title: string; artist: string | null; contentHtml: string }[];
}

/** معرّف الوصلة من ‎/playlists/<id>[/view]‎. */
function usePlaylistIdFromPath(): string {
  return decodeURIComponent(usePathname().split("/")[2] ?? "");
}

function findPlaylist(dataset: OfflineDataset, id: string): OfflinePlaylist | null {
  return dataset.me?.playlists.find((p) => p.id === id) ?? null;
}

function playlistLyrics(dataset: OfflineDataset, playlist: OfflinePlaylist): OfflineLyric[] {
  return playlist.itemIds.map((id) => dataset.byId.get(id)).filter((l): l is OfflineLyric => !!l);
}

export function PlaylistsPage({ initial }: { initial: PlaylistSummary[] | null }) {
  const state = useOfflinePageData(
    initial,
    (dataset) =>
      dataset.me?.playlists.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        isPublic: p.isPublic,
        createdAt: p.createdAt,
        itemCount: p.itemIds.length,
      })) ?? null,
    "playlists",
  );
  if (state.status !== "ready") return <OfflinePageFallback status={state.status} />;
  return (
    <>
      <div className="sm:hidden">
        <PlaylistsScreen initial={state.data} />
      </div>
      <div className="hidden sm:block">
        <PlaylistsView initial={state.data} />
      </div>
    </>
  );
}

export function PlaylistDetailPage({ data }: { data: PlaylistDetailData | null }) {
  const id = usePlaylistIdFromPath();
  const state = useOfflinePageData(
    data,
    (dataset): PlaylistDetailData | null => {
      const playlist = findPlaylist(dataset, id);
      if (!playlist) return null;
      return {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        isPublic: playlist.isPublic,
        items: playlistLyrics(dataset, playlist).map((l) => ({
          lyricsId: l.id,
          title: l.title,
          artist: l.artist,
          album: l.album,
        })),
        shareUrl: `${window.location.origin}/p/${playlist.shareToken}`,
      };
    },
    id,
  );
  if (state.status !== "ready") return <OfflinePageFallback status={state.status} />;
  const playlist = state.data;
  return (
    <>
      <div className="sm:hidden">
        <PlaylistDetailScreen
          id={playlist.id}
          title={playlist.title}
          description={playlist.description}
          isPublic={playlist.isPublic}
          items={playlist.items}
          shareUrl={playlist.shareUrl}
        />
      </div>
      <div className="hidden sm:block">
        <PlaylistDetailView
          playlist={{
            id: playlist.id,
            title: playlist.title,
            description: playlist.description,
            isPublic: playlist.isPublic,
            items: playlist.items,
          }}
          shareUrl={playlist.shareUrl}
        />
      </div>
    </>
  );
}

export function PlaylistReadPage({ data }: { data: PlaylistReadData | null }) {
  const id = usePlaylistIdFromPath();
  const state = useOfflinePageData(
    data,
    (dataset): PlaylistReadData | null => {
      const playlist = findPlaylist(dataset, id);
      if (!playlist) return null;
      return {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        isPublic: playlist.isPublic,
        items: playlistLyrics(dataset, playlist).map((l) => ({
          lyricsId: l.id,
          title: l.title,
          artist: l.artist,
          contentHtml: l.contentHtml,
        })),
      };
    },
    id,
  );
  if (state.status !== "ready") return <OfflinePageFallback status={state.status} />;
  return <PlaylistReadView {...state.data} />;
}

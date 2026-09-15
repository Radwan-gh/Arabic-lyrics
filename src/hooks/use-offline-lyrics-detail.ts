"use client";

import { useEffect, useState } from "react";
import { stripHtml } from "@/lib/arabic-search";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import { useRealLocation } from "@/hooks/use-real-location";
import type { OfflineLyric, OfflineMe } from "@/lib/offline";
import type { PlaylistNavContext } from "@/lib/playlists";

export interface ReaderSsrData {
  lyricsId: string;
  title: string;
  artist: string | null;
  album: string | null;
  /** ISO string. */
  createdAt: string;
  /** اسم من أضاف الأنشودة — غير مخزَّن في لقطة القراءة دون اتصال. */
  createdByName: string | null;
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

export interface UseOfflineLyricsDetailResult {
  view: ReaderSsrData | null;
  online: boolean;
  found: boolean;
  sourcedFromCache: boolean;
}

function buildOfflinePlaylistNav(
  playlistId: string | null,
  lyricsId: string,
  me: OfflineMe | null,
  lyricsById: Map<string, OfflineLyric>
): PlaylistNavContext | null {
  if (!playlistId || !me) return null;
  const playlist = me.playlists.find((p) => p.id === playlistId);
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
    prevTitle: prevId ? (lyricsById.get(prevId)?.title ?? null) : null,
    nextId,
    nextTitle: nextId ? (lyricsById.get(nextId)?.title ?? null) : null,
  };
}

/**
 * يُوحِّد مصدر بيانات صفحة الأنشودة بين SSR الطبيعي ومسار القراءة دون اتصال.
 * `ssr === null` يعني أن الصفحة لم تُصيَّر على الخادم (غلاف احتياطي لمسار لم
 * يُخزَّن بعينه) — عندها تُقرأ الأنشودة من لقطة المجموعة المخزَّنة بمعرِّفها.
 */
export function useOfflineLyricsDetail(ssr: ReaderSsrData | null, id: string): UseOfflineLyricsDetailResult {
  const realLocation = useRealLocation();
  const [usingSnapshot, setUsingSnapshot] = useState(ssr === null);
  const snapshot = useOfflineSnapshot(usingSnapshot || ssr === null);
  const online = snapshot.online;

  useEffect(() => {
    if (!online) setUsingSnapshot(true);
  }, [online]);

  if (!usingSnapshot) {
    return { view: ssr, online, found: ssr !== null, sourcedFromCache: false };
  }

  const lyric = snapshot.lyricsById.get(id);
  if (!lyric) {
    return { view: null, online, found: false, sourcedFromCache: true };
  }

  const playlistId = realLocation ? new URLSearchParams(realLocation.search).get("playlist") : null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const view: ReaderSsrData = {
    lyricsId: lyric.id,
    title: lyric.title,
    artist: lyric.artist,
    album: lyric.album,
    createdAt: lyric.createdAt,
    createdByName: null,
    viewCount: 0,
    tags: lyric.tags,
    contentHtml: lyric.contentHtml,
    favorited: (snapshot.me?.favorites ?? []).includes(lyric.id),
    loggedIn: snapshot.me !== null,
    canModify: false,
    shareUrl: `${origin}/lyrics/${lyric.id}`,
    shareText: [lyric.title, lyric.artist, stripHtml(lyric.contentHtml)].filter(Boolean).join("\n\n"),
    siteLabel: typeof window !== "undefined" ? window.location.host : undefined,
    playlist: buildOfflinePlaylistNav(playlistId, lyric.id, snapshot.me, snapshot.lyricsById),
  };

  return { view, online, found: true, sourcedFromCache: true };
}

"use client";

import { useEffect, useState } from "react";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";
import type { PlaylistBodyItem } from "@/components/PlaylistCollapsibleBody";

export interface PlaylistViewSsrData {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: PlaylistBodyItem[];
}

export interface UseOfflinePlaylistViewResult {
  view: PlaylistViewSsrData | null;
  online: boolean;
  found: boolean;
  loggedIn: boolean;
  sourcedFromCache: boolean;
}

/**
 * يُوحِّد مصدر بيانات صفحة عرض وصلة واحدة (/playlists/[id]/view) بين SSR
 * الطبيعي ومسار القراءة دون اتصال. isPublic غير مخزَّنة في لقطة OfflineMe
 * (غير لازمة للعرض المخزَّن الخاص بالمالك) فتُعرَض false افتراضيًا أوفلاين.
 */
export function useOfflinePlaylistView(ssr: PlaylistViewSsrData | null, id: string): UseOfflinePlaylistViewResult {
  const [usingSnapshot, setUsingSnapshot] = useState(ssr === null);
  const snapshot = useOfflineSnapshot(usingSnapshot || ssr === null);
  const online = snapshot.online;

  useEffect(() => {
    if (!online) setUsingSnapshot(true);
  }, [online]);

  if (!usingSnapshot) {
    return { view: ssr, online, found: ssr !== null, loggedIn: true, sourcedFromCache: false };
  }

  if (!snapshot.me) {
    return { view: null, online, found: false, loggedIn: false, sourcedFromCache: true };
  }

  const playlist = snapshot.me.playlists.find((p) => p.id === id);
  if (!playlist) {
    return { view: null, online, found: false, loggedIn: true, sourcedFromCache: true };
  }

  const items: PlaylistBodyItem[] = playlist.itemIds
    .map((lid) => snapshot.lyricsById.get(lid))
    .filter((l): l is NonNullable<typeof l> => !!l)
    .map((l) => ({ lyricsId: l.id, title: l.title, artist: l.artist, contentHtml: l.contentHtml }));

  const view: PlaylistViewSsrData = {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    isPublic: false,
    items,
  };

  return { view, online, found: true, loggedIn: true, sourcedFromCache: true };
}

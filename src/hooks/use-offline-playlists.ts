"use client";

import { useEffect, useState } from "react";
import { useOfflineSnapshot } from "@/hooks/use-offline-snapshot";

export interface PlaylistSummary {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  itemCount: number;
}

export interface UseOfflinePlaylistsResult {
  items: PlaylistSummary[];
  online: boolean;
  loggedIn: boolean;
  sourcedFromCache: boolean;
  /** رابط كل وصلة: الإدارة أونلاين (كالمعتاد)، وعرض القراءة فقط أوفلاين — إدارة
   * الوصلة (إعادة تسمية/حذف/ترتيب) تتطلّب شبكة ولا تدعمها المرآة المدموجة. */
  hrefFor: (id: string) => string;
  /** إنشاء وصلة جديدة طفرة على الخادم — معطّل أوفلاين. */
  canCreate: boolean;
}

/**
 * يُوحِّد مصدر بيانات «وصلاتي» بين SSR الطبيعي ومسار القراءة دون اتصال. لقطة
 * OfflineMe لا تحمل isPublic/createdAt لكل وصلة (غير لازمة للعرض المخزَّن) —
 * تُعرَض دون شارة «عامة» حين تكون غير معروفة، وبتاريخ لقطة المستخدم كبديل معقول.
 */
export function useOfflinePlaylists(ssr: PlaylistSummary[] | null): UseOfflinePlaylistsResult {
  const [usingSnapshot, setUsingSnapshot] = useState(ssr === null);
  const snapshot = useOfflineSnapshot(usingSnapshot || ssr === null);
  const online = snapshot.online;

  useEffect(() => {
    if (!online) setUsingSnapshot(true);
  }, [online]);

  if (!usingSnapshot) {
    return {
      items: ssr!,
      online,
      loggedIn: true,
      sourcedFromCache: false,
      hrefFor: (id) => `/playlists/${id}`,
      canCreate: true,
    };
  }

  const items: PlaylistSummary[] = (snapshot.me?.playlists ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    isPublic: false,
    createdAt: snapshot.me?.updatedAt ?? new Date().toISOString(),
    itemCount: p.itemIds.length,
  }));

  return {
    items,
    online,
    loggedIn: snapshot.me !== null,
    sourcedFromCache: true,
    hrefFor: (id) => `/playlists/${id}/view`,
    canCreate: online,
  };
}

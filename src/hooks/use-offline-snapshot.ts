"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSearchText } from "@/lib/arabic-search";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  OFFLINE_LYRICS_URL,
  OFFLINE_ME_URL,
  type OfflineCollection,
  type OfflineLyric,
  type OfflineMe,
} from "@/lib/offline";

// ─────────────────────────────────────────────────────────────────────────────
// لقطتا القراءة دون اتصال: التطبيق يجلبهما عبر fetch العادي، ويتولّى الـ
// service worker (public/sw.js) إرجاعهما من الكاش عند انقطاع الشبكة. تُستخدَمان
// كمصدر بيانات بديل داخل الصفحات الحقيقية نفسها عند عدم توفّر بيانات من الخادم.
// ─────────────────────────────────────────────────────────────────────────────

export function useOfflineCollection(enabled = true): {
  collection: OfflineCollection | null;
  loading: boolean;
  reload: () => void;
} {
  const [collection, setCollection] = useState<OfflineCollection | null>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(OFFLINE_LYRICS_URL, { cache: "no-store" });
      if (res.ok) setCollection((await res.json()) as OfflineCollection);
    } catch {
      // لا شبكة ولا كاش — نُبقي القيمة الحالية (قد تكون null).
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { collection, loading, reload: load };
}

export function useOfflineMe(enabled = true): { me: OfflineMe | null; loading: boolean; reload: () => void } {
  const [me, setMe] = useState<OfflineMe | null>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(OFFLINE_ME_URL, { cache: "no-store" });
      if (res.ok) setMe((await res.json()) as OfflineMe);
      else if (res.status === 401) setMe(null);
    } catch {
      // مستخدم غير مسجّل أو لا بيانات مخزَّنة.
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { me, loading, reload: load };
}

export interface OfflineSnapshot {
  collection: OfflineCollection | null;
  me: OfflineMe | null;
  loading: boolean;
  online: boolean;
  lyricsById: Map<string, OfflineLyric>;
  searchIndex: Map<string, string>;
  reload: () => void;
}

/**
 * يُركِّب اللقطتين + حالة الاتصال + فهارس مبنيّة منهما مرّة واحدة.
 * `enabled=false` يُطفئ الجلب تمامًا (يُستخدَم أونلاين وبيانات SSR متوفّرة، حتى
 * لا نكرّر جلب ما هيّأه ServiceWorkerRegister أصلًا في الخلفية بلا حاجة).
 */
export function useOfflineSnapshot(enabled = true): OfflineSnapshot {
  const online = useOnlineStatus();
  const { collection, loading: loadingCollection, reload: reloadCollection } = useOfflineCollection(enabled);
  const { me, loading: loadingMe, reload: reloadMe } = useOfflineMe(enabled);

  const lyricsById = useMemo(() => {
    const map = new Map<string, OfflineLyric>();
    for (const l of collection?.lyrics ?? []) map.set(l.id, l);
    return map;
  }, [collection]);

  const searchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of collection?.lyrics ?? []) {
      map.set(
        l.id,
        buildSearchText({ title: l.title, artist: l.artist, album: l.album, content: l.contentHtml })
      );
    }
    return map;
  }, [collection]);

  const reload = useCallback(() => {
    void reloadCollection();
    void reloadMe();
  }, [reloadCollection, reloadMe]);

  return {
    collection,
    me,
    loading: loadingCollection || loadingMe,
    online,
    lyricsById,
    searchIndex,
    reload,
  };
}

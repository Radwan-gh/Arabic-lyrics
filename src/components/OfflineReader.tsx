"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LyricsCard } from "@/components/LyricsCard";
import { PlaylistCollapsibleBody } from "@/components/PlaylistCollapsibleBody";
import { buildSearchText, normalizeArabic } from "@/lib/arabic-search";
import { btnPrimary, focusRing } from "@/lib/ui";
import {
  OFFLINE_LYRICS_URL,
  OFFLINE_ME_URL,
  type OfflineCollection,
  type OfflineLyric,
  type OfflineMe,
} from "@/lib/offline";

type Tab = "collection" | "favorites" | "playlists";

export function OfflineReader() {
  const [collection, setCollection] = useState<OfflineCollection | null>(null);
  const [me, setMe] = useState<OfflineMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState<Tab>("collection");
  const [query, setQuery] = useState("");
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);

  // حمّل اللقطات عبر fetch العادي؛ يتولّى الـ SW إرجاعها من الكاش عند انقطاع الشبكة.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(OFFLINE_LYRICS_URL, { cache: "no-store" });
      if (res.ok) setCollection((await res.json()) as OfflineCollection);
    } catch {
      // لا شبكة ولا كاش — نُبقي القيمة الحالية (قد تكون null).
    }
    try {
      const res = await fetch(OFFLINE_ME_URL, { cache: "no-store" });
      if (res.ok) setMe((await res.json()) as OfflineMe);
      else if (res.status === 401) setMe(null);
    } catch {
      // مستخدم غير مسجّل أو لا بيانات مخزَّنة.
    }
    setLoading(false);
    // قِس الحجم بعد أن يخزّن الـ SW اللقطات (تحديث الخلفية قد يتأخّر قليلًا).
    setCacheBytes(await measureCachedBytes());
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    void load();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [load]);

  const lyricsById = useMemo(() => {
    const map = new Map<string, OfflineLyric>();
    for (const l of collection?.lyrics ?? []) map.set(l.id, l);
    return map;
  }, [collection]);

  // فهرس بحث مُطبَّع لكل نشيد (يُحسب مرة واحدة).
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

  const filterLyrics = useCallback(
    (list: OfflineLyric[]) => {
      const nq = normalizeArabic(query);
      if (!nq) return list;
      return list.filter((l) => (searchIndex.get(l.id) ?? "").includes(nq));
    },
    [query, searchIndex]
  );

  const favoriteLyrics = useMemo(
    () => (me?.favorites ?? []).map((id) => lyricsById.get(id)).filter((l): l is OfflineLyric => !!l),
    [me, lyricsById]
  );

  const openPlaylist = useMemo(
    () => me?.playlists.find((p) => p.id === openPlaylistId) ?? null,
    [me, openPlaylistId]
  );

  const playlistLyrics = useMemo(
    () =>
      (openPlaylist?.itemIds ?? []).map((id) => lyricsById.get(id)).filter((l): l is OfflineLyric => !!l),
    [openPlaylist, lyricsById]
  );

  // نفس شكل عرض الوصلة أونلاين: ملخّص قابل للطي ثم كل نشيد بمحتواه.
  const playlistBodyItems = useMemo(
    () =>
      playlistLyrics.map((l) => ({
        lyricsId: l.id,
        title: l.title,
        artist: l.artist,
        contentHtml: l.contentHtml,
      })),
    [playlistLyrics]
  );

  const collectionCount = collection?.lyrics.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* الترويسة والحالة */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">القراءة دون اتصال</h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
            {online ? "متصل" : "غير متصل"}
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          تصفّح واقرأ الأناشيد ومفضّلتك ووصلاتك دون إنترنت. تُحدَّث النسخة المحفوظة تلقائياً كلما فتحت
          التطبيق وأنت متصل.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          <span>محفوظ للقراءة دون اتصال: {collectionCount.toLocaleString("en-US")} نشيد</span>
          {cacheBytes !== null && <span>· الحجم: {formatMB(cacheBytes)}</span>}
          {collection?.updatedAt && (
            <span>· آخر تحديث: {new Date(collection.updatedAt).toLocaleString("ar")}</span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={!online || loading}
            className={`rounded-md border border-neutral-300 px-3 py-1 font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
          >
            {loading ? "جارٍ التحديث…" : "تحديث الآن"}
          </button>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200">
        <TabButton active={tab === "collection"} onClick={() => setTab("collection")}>
          المجموعة
        </TabButton>
        <TabButton active={tab === "favorites"} onClick={() => setTab("favorites")}>
          مفضّلتي
        </TabButton>
        <TabButton
          active={tab === "playlists"}
          onClick={() => {
            setTab("playlists");
            setOpenPlaylistId(null);
          }}
        >
          وصلاتي
        </TabButton>
      </div>

      {/* شريط البحث (للمجموعة والمفضّلة فقط — عرض الوصلة يطابق شكل الأونلاين بلا بحث) */}
      {tab !== "playlists" && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في الأناشيد… (يتجاهل التشكيل)"
          className={`w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 ${focusRing}`}
        />
      )}

      {/* المحتوى */}
      {loading && collectionCount === 0 ? (
        <EmptyBox>جارٍ التحميل…</EmptyBox>
      ) : collectionCount === 0 ? (
        <EmptyBox>
          لم تُنزَّل الأناشيد بعد. اتصل بالإنترنت وافتح التطبيق مرة واحدة لحفظها للقراءة دون اتصال.
        </EmptyBox>
      ) : tab === "collection" ? (
        <LyricsGrid items={filterLyrics(collection!.lyrics)} emptyText="لا توجد نتائج مطابقة لبحثك" />
      ) : tab === "favorites" ? (
        me ? (
          <LyricsGrid
            items={filterLyrics(favoriteLyrics)}
            emptyText={
              favoriteLyrics.length === 0
                ? "لا توجد أناشيد في مفضّلتك بعد."
                : "لا توجد نتائج مطابقة لبحثك في مفضّلتك"
            }
          />
        ) : (
          <EmptyBox>
            سجّل الدخول وأنت متصل بالإنترنت لحفظ مفضّلتك للقراءة دون اتصال.
          </EmptyBox>
        )
      ) : /* tab === "playlists" */ openPlaylist ? (
        // عرض الوصلة — نفس شكل صفحة العرض أونلاين (PlaylistReadView).
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4">
            <button
              type="button"
              onClick={() => setOpenPlaylistId(null)}
              className={`inline-flex items-center gap-1 self-start rounded-sm text-sm text-neutral-600 hover:text-emerald-700 ${focusRing}`}
            >
              <span aria-hidden>→</span> كل الوصلات
            </button>
            <h1 className="text-3xl font-extrabold">{openPlaylist.title}</h1>
            {openPlaylist.description && <p className="text-neutral-600">{openPlaylist.description}</p>}
            <p className="text-sm text-neutral-500">{playlistBodyItems.length} نشيد</p>
          </div>

          <PlaylistCollapsibleBody items={playlistBodyItems} />
        </div>
      ) : me ? (
        me.playlists.length === 0 ? (
          <EmptyBox>لا توجد لديك وصلات بعد.</EmptyBox>
        ) : (
          // قائمة الوصلات — نفس شكل صفحة «وصلاتي» أونلاين (PlaylistsView).
          <ul className="flex flex-col gap-3">
            {me.playlists.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpenPlaylistId(p.id)}
                    className={`rounded-sm text-start text-lg font-bold hover:text-emerald-700 ${focusRing}`}
                  >
                    {p.title}
                  </button>
                  {p.description && <p className="mt-0.5 text-sm text-neutral-500">{p.description}</p>}
                  <p className="mt-1 text-xs text-neutral-500">{p.itemIds.length} نشيد</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenPlaylistId(p.id)}
                  className={`${btnPrimary} shrink-0 px-3 py-1.5`}
                >
                  عرض
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <EmptyBox>سجّل الدخول وأنت متصل بالإنترنت لحفظ وصلاتك للقراءة دون اتصال.</EmptyBox>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium ${focusRing} ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function LyricsGrid({ items, emptyText }: { items: OfflineLyric[]; emptyText: string }) {
  if (items.length === 0) return <EmptyBox>{emptyText}</EmptyBox>;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((l) => (
        <LyricsCard
          key={l.id}
          id={l.id}
          title={l.title}
          artist={l.artist}
          album={l.album}
          tags={l.tags}
          createdAt={new Date(l.createdAt)}
          contentHtml={l.contentHtml}
        />
      ))}
    </ul>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
      {children}
    </p>
  );
}

// يجمع الحجم الفعلي (بالبايت) لما خزّنه الـ service worker في كاشات التطبيق
// (anaasheed-*): هيكل التطبيق ولقطتا البيانات. يُرجِع null إن تعذّر القياس.
async function measureCachedBytes(): Promise<number | null> {
  if (typeof caches === "undefined") return null;
  try {
    const names = (await caches.keys()).filter((name) => name.startsWith("anaasheed-"));
    let total = 0;
    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      for (const request of requests) {
        const response = await cache.match(request);
        if (!response) continue;
        // استخدم Content-Length إن توفّر، وإلا اقرأ الجسم لحساب حجمه الحقيقي.
        const length = Number(response.headers.get("content-length"));
        total += Number.isFinite(length) && length > 0
          ? length
          : (await response.clone().arrayBuffer()).byteLength;
      }
    }
    return total;
  } catch {
    return null;
  }
}

// يصوغ البايتات كنص بالميغابايت (بدقّة أعلى للأحجام الصغيرة).
function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const value = mb < 10 ? mb.toFixed(2) : mb.toFixed(1);
  return `${value} ميغابايت`;
}

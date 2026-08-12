"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LyricsCard } from "@/components/LyricsCard";
import { LyricsFontControls } from "@/components/LyricsFontControls";
import { buildSearchText, normalizeArabic } from "@/lib/arabic-search";
import { formatDate } from "@/lib/format";
import { lyricsProseCls } from "@/lib/lyrics-prose";
import { focusRing } from "@/lib/ui";
import {
  OFFLINE_LYRICS_URL,
  OFFLINE_ME_URL,
  type OfflineCollection,
  type OfflineLyric,
  type OfflineMe,
  type OfflinePlaylist,
} from "@/lib/offline";

const PAGE_SIZE = 12;

// ─────────────────────────────────────────────────────────────────────────────
// تحميل اللقطات + حالة الاتصال (مشترك بين الواجهة الرئيسية للقارئ ومرآة الصفحات).
// التطبيق يجلب اللقطات عبر fetch العادي؛ يتولّى الـ service worker إرجاعها من
// الكاش عند انقطاع الشبكة (راجع public/sw.js).
// ─────────────────────────────────────────────────────────────────────────────
interface OfflineData {
  collection: OfflineCollection | null;
  me: OfflineMe | null;
  loading: boolean;
  online: boolean;
  cacheBytes: number | null;
  lyricsById: Map<string, OfflineLyric>;
  searchIndex: Map<string, string>;
  reload: () => void;
}

function useOfflineData(): OfflineData {
  const [collection, setCollection] = useState<OfflineCollection | null>(null);
  const [me, setMe] = useState<OfflineMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);

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

  // فهرس بحث مُطبَّع لكل نشيد (يُحسب مرة واحدة لكل لقطة).
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

  return { collection, me, loading, online, cacheBytes, lyricsById, searchIndex, reload: load };
}

// ─────────────────────────────────────────────────────────────────────────────
// تحليل المسار الحالي إلى واجهة مقابلة. عند انقطاع النت يخدم الـ SW غلاف /offline
// لأي مسار غير مُخزَّن، فنقرأ location.pathname لنعرض «نفس الواجهة» من اللقطة.
// ─────────────────────────────────────────────────────────────────────────────
type Route =
  | { kind: "hub" }
  | { kind: "home"; q: string; tags: string[] }
  | { kind: "detail"; id: string }
  | { kind: "favorites"; q: string }
  | { kind: "playlists" }
  | { kind: "playlist"; id: string };

function parseRoute(pathname: string, search: string): Route {
  const params = new URLSearchParams(search);
  if (pathname === "/" || pathname === "") {
    const tags = (params.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return { kind: "home", q: params.get("q") ?? "", tags };
  }
  if (pathname === "/favorites") return { kind: "favorites", q: params.get("q") ?? "" };
  if (pathname === "/playlists") return { kind: "playlists" };
  const playlist = pathname.match(/^\/playlists\/([^/]+)(?:\/view)?\/?$/);
  if (playlist) return { kind: "playlist", id: decodeURIComponent(playlist[1]) };
  const detail = pathname.match(/^\/lyrics\/([^/]+)\/?$/);
  if (detail) return { kind: "detail", id: decodeURIComponent(detail[1]) };
  // /offline نفسها، وأي مسار آخر لا تُغطّيه المرآة → واجهة القارئ الكاملة.
  return { kind: "hub" };
}

export function OfflineReader() {
  const data = useOfflineData();
  const [route, setRoute] = useState<Route | null>(null);

  // اقرأ المسار الحقيقي بعد التركيب (لا يتوفّر window أثناء التصيير على الخادم)،
  // وحدّثه مع أزرار الرجوع/التقدّم.
  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.pathname, window.location.search));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  if (!route || route.kind === "hub") {
    return <OfflineHub data={data} />;
  }
  return <OfflineMirror route={route} data={data} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// مرآة الصفحات: تعرض نفس واجهة المسار المطلوب من اللقطة المخزَّنة، مع شريط تنبيه
// يوضّح أنها نسخة محفوظة. روابط البطاقات والوسوم تبقى عاملة: عند النقر يخدم الـ SW
// غلاف /offline للمسار الجديد فتُعاد المرآة عليه.
// ─────────────────────────────────────────────────────────────────────────────
function OfflineMirror({ route, data }: { route: Exclude<Route, { kind: "hub" }>; data: OfflineData }) {
  const { collection, me, loading, online, lyricsById, searchIndex } = data;

  const filterBySearch = useCallback(
    (list: OfflineLyric[], query: string) => {
      const nq = normalizeArabic(query);
      if (!nq) return list;
      return list.filter((l) => (searchIndex.get(l.id) ?? "").includes(nq));
    },
    [searchIndex]
  );

  const ready = collection !== null;

  return (
    <div className="flex flex-col gap-6">
      <OfflineNotice online={online} onReload={data.reload} />

      {!ready ? (
        loading ? (
          <EmptyBox>جارٍ تحميل النسخة المحفوظة…</EmptyBox>
        ) : (
          <EmptyBox>
            لم تُحفظ الأناشيد على هذا الجهاز بعد. اتصل بالإنترنت وافتح التطبيق مرة واحدة، ثم عاود
            المحاولة دون اتصال.
          </EmptyBox>
        )
      ) : route.kind === "home" ? (
        <HomeMirror
          route={route}
          lyrics={collection!.lyrics}
          filterBySearch={filterBySearch}
        />
      ) : route.kind === "detail" ? (
        <DetailMirror lyric={lyricsById.get(route.id) ?? null} />
      ) : route.kind === "favorites" ? (
        <FavoritesMirror me={me} lyricsById={lyricsById} filterBySearch={filterBySearch} route={route} />
      ) : route.kind === "playlists" ? (
        <PlaylistsMirror me={me} />
      ) : (
        <PlaylistMirror
          me={me}
          id={route.id}
          lyricsById={lyricsById}
          filterBySearch={filterBySearch}
        />
      )}
    </div>
  );
}

// شريط تنبيه أعلى المرآة: يوضّح أنّها نسخة محفوظة، ويعرض زر تحديث عند عودة الاتصال.
function OfflineNotice({ online, onReload }: { online: boolean; onReload: () => void }) {
  if (online) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
        <span>عاد الاتصال بالإنترنت. حدّث الصفحة لعرض أحدث نسخة.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`rounded-md border border-emerald-300 bg-white px-3 py-1 font-medium text-emerald-700 hover:bg-emerald-100 ${focusRing}`}
        >
          تحديث الصفحة
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
      <span>أنت غير متصل بالإنترنت — تُعرض نسخة محفوظة على جهازك (قد لا تكون الأحدث).</span>
    </div>
  );
}

// مرآة الصفحة الرئيسية: بحث حيّ + تصفية بالوسوم (من المسار) + ترقيم في العميل.
function HomeMirror({
  route,
  lyrics,
  filterBySearch,
}: {
  route: Extract<Route, { kind: "home" }>;
  lyrics: OfflineLyric[];
  filterBySearch: (list: OfflineLyric[], q: string) => OfflineLyric[];
}) {
  const [query, setQuery] = useState(route.q);
  const [page, setPage] = useState(1);

  const byTags = useMemo(() => {
    if (route.tags.length === 0) return lyrics;
    // مطابقة دلالة الخادم: يُعرض النشيد إن حمل أيًّا من الوسوم المحدَّدة (hasSome).
    return lyrics.filter((l) => l.tags.some((t) => route.tags.includes(t)));
  }, [lyrics, route.tags]);

  const filtered = useMemo(() => filterBySearch(byTags, query), [byTags, query, filterBySearch]);

  // أعِد الترقيم للصفحة الأولى عند تغيّر البحث.
  useEffect(() => setPage(1), [query, route.tags]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث في الأناشيد… (يتجاهل التشكيل)"
        className={`w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 ${focusRing}`}
      />

      {route.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <span className="font-medium text-neutral-700">الوسوم:</span>
          {route.tags.map((t) => (
            <span key={t} className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">
              #{t}
            </span>
          ))}
          <Link href="/" className={`rounded-sm text-xs font-medium text-emerald-700 hover:underline ${focusRing}`}>
            مسح التصفية
          </Link>
        </div>
      )}

      <p className="text-sm text-neutral-600">
        المحفوظ: <span className="font-medium text-neutral-800">{lyrics.length.toLocaleString("en-US")}</span>
        {(query || route.tags.length > 0) && (
          <span> ، نتائج مطابقة: {filtered.length.toLocaleString("en-US")}</span>
        )}
      </p>

      <LyricsGrid items={slice} emptyText={query || route.tags.length ? "لا توجد نتائج مطابقة" : "لا توجد أناشيد محفوظة"} />

      <ClientPagination page={current} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}

// مرآة صفحة النشيد: نفس تخطيط المقال، دون أزرار التعديل/المفضّلة (لا تعمل دون اتصال).
function DetailMirror({ lyric }: { lyric: OfflineLyric | null }) {
  if (!lyric) {
    return (
      <EmptyBox>
        هذه الأنشودة غير محفوظة على جهازك. اتصل بالإنترنت لعرضها، أو عُد إلى المجموعة المحفوظة.
        <span className="mt-3 block">
          <Link href="/" className={`font-medium text-emerald-700 hover:underline ${focusRing}`}>
            ▸ المجموعة المحفوظة
          </Link>
        </span>
      </EmptyBox>
    );
  }

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-1 border-b border-neutral-100 pb-4">
        <h1 className="text-2xl font-extrabold">{lyric.title}</h1>
        {lyric.artist && <p className="text-emerald-700">{lyric.artist}</p>}
        {lyric.album && <p className="text-sm text-neutral-500">{lyric.album}</p>}
        <p className="text-xs text-neutral-500">{formatDate(new Date(lyric.createdAt))}</p>
      </header>

      <div className="mb-4 flex justify-end">
        <LyricsFontControls />
      </div>

      <div dir="rtl" className={lyricsProseCls} dangerouslySetInnerHTML={{ __html: lyric.contentHtml }} />

      {lyric.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lyric.tags.map((tag) => (
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
  );
}

// مرآة المفضّلة: تتطلّب لقطة المستخدم (تُحفظ عند تسجيل الدخول وأنت متصل).
function FavoritesMirror({
  me,
  lyricsById,
  filterBySearch,
  route,
}: {
  me: OfflineMe | null;
  lyricsById: Map<string, OfflineLyric>;
  filterBySearch: (list: OfflineLyric[], q: string) => OfflineLyric[];
  route: Extract<Route, { kind: "favorites" }>;
}) {
  const [query, setQuery] = useState(route.q);

  const favoriteLyrics = useMemo(
    () => (me?.favorites ?? []).map((id) => lyricsById.get(id)).filter((l): l is OfflineLyric => !!l),
    [me, lyricsById]
  );

  if (!me) {
    return <EmptyBox>سجّل الدخول وأنت متصل بالإنترنت لحفظ مفضّلتك للقراءة دون اتصال.</EmptyBox>;
  }

  const filtered = filterBySearch(favoriteLyrics, query);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">المفضلة</h1>
        <p className="mt-1 text-sm text-neutral-500">الأناشيد التي أضفتها إلى مفضّلتك (نسخة محفوظة).</p>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث في مفضّلتك… (يتجاهل التشكيل)"
        className={`w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 ${focusRing}`}
      />
      <LyricsGrid
        items={filtered}
        emptyText={
          favoriteLyrics.length === 0
            ? "لا توجد أناشيد في مفضّلتك بعد."
            : "لا توجد نتائج مطابقة لبحثك في مفضّلتك"
        }
      />
    </div>
  );
}

// مرآة قائمة القوائم.
function PlaylistsMirror({ me }: { me: OfflineMe | null }) {
  if (!me) {
    return <EmptyBox>سجّل الدخول وأنت متصل بالإنترنت لحفظ قوائمك للقراءة دون اتصال.</EmptyBox>;
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">قوائمي</h1>
        <p className="mt-1 text-sm text-neutral-500">قوائم التشغيل الخاصة بك (نسخة محفوظة).</p>
      </div>
      {me.playlists.length === 0 ? (
        <EmptyBox>لا توجد لديك قوائم بعد.</EmptyBox>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {me.playlists.map((p) => (
            <li key={p.id}>
              <Link
                href={`/playlists/${p.id}`}
                className={`block h-full rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focusRing}`}
              >
                <h2 className="truncate text-lg font-bold text-neutral-900">{p.title}</h2>
                {p.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{p.description}</p>
                )}
                <p className="mt-2 text-xs text-neutral-500">{p.itemIds.length} نشيد</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// مرآة قائمة واحدة.
function PlaylistMirror({
  me,
  id,
  lyricsById,
  filterBySearch,
}: {
  me: OfflineMe | null;
  id: string;
  lyricsById: Map<string, OfflineLyric>;
  filterBySearch: (list: OfflineLyric[], q: string) => OfflineLyric[];
}) {
  const [query, setQuery] = useState("");
  const playlist: OfflinePlaylist | null = me?.playlists.find((p) => p.id === id) ?? null;

  const items = useMemo(
    () =>
      (playlist?.itemIds ?? []).map((lid) => lyricsById.get(lid)).filter((l): l is OfflineLyric => !!l),
    [playlist, lyricsById]
  );

  if (!me) {
    return <EmptyBox>سجّل الدخول وأنت متصل بالإنترنت لحفظ قوائمك للقراءة دون اتصال.</EmptyBox>;
  }
  if (!playlist) {
    return (
      <EmptyBox>
        هذه القائمة غير محفوظة على جهازك.
        <span className="mt-3 block">
          <Link href="/playlists" className={`font-medium text-emerald-700 hover:underline ${focusRing}`}>
            ▸ كل القوائم
          </Link>
        </span>
      </EmptyBox>
    );
  }

  const filtered = filterBySearch(items, query);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/playlists" className={`self-start rounded-sm text-sm font-medium text-emerald-700 hover:underline ${focusRing}`}>
        ▸ كل القوائم
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{playlist.title}</h1>
        {playlist.description && <p className="mt-0.5 text-sm text-neutral-500">{playlist.description}</p>}
      </div>
      {items.length > 3 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في القائمة… (يتجاهل التشكيل)"
          className={`w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 ${focusRing}`}
        />
      )}
      <LyricsGrid items={filtered} emptyText={query ? "لا توجد نتائج مطابقة لبحثك" : "هذه القائمة فارغة."} />
    </div>
  );
}

// ترقيم في العميل بمظهر مطابق لشريط الترقيم في الصفحات المتصلة.
function ClientPagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  const cls = `rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="ترقيم الصفحات">
      <button type="button" className={cls} onClick={() => onChange(page - 1)} disabled={page <= 1}>
        السابق
      </button>
      <span className="text-sm text-neutral-600">
        صفحة {page.toLocaleString("en-US")} من {pageCount.toLocaleString("en-US")}
      </span>
      <button type="button" className={cls} onClick={() => onChange(page + 1)} disabled={page >= pageCount}>
        التالي
      </button>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// واجهة القارئ الكاملة (hub) — تُعرض عند زيارة /offline مباشرةً: تبويبات المجموعة
// والمفضّلة والقوائم مع حالة الحفظ وحجمه وزر التحديث.
// ─────────────────────────────────────────────────────────────────────────────
type Tab = "collection" | "favorites" | "playlists";

function OfflineHub({ data }: { data: OfflineData }) {
  const { collection, me, loading, online, cacheBytes, lyricsById, searchIndex, reload } = data;
  const [tab, setTab] = useState<Tab>("collection");
  const [query, setQuery] = useState("");
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);

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
          تصفّح واقرأ الأناشيد ومفضّلتك وقوائمك دون إنترنت. تُحدَّث النسخة المحفوظة تلقائياً كلما فتحت
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
            onClick={() => void reload()}
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
          قوائمي
        </TabButton>
      </div>

      {/* شريط البحث (للمجموعة والمفضّلة وعناصر قائمة مفتوحة) */}
      {(tab !== "playlists" || openPlaylist) && (
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
          <EmptyBox>سجّل الدخول وأنت متصل بالإنترنت لحفظ مفضّلتك للقراءة دون اتصال.</EmptyBox>
        )
      ) : /* tab === "playlists" */ openPlaylist ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setOpenPlaylistId(null)}
            className={`self-start rounded-sm text-sm font-medium text-emerald-700 hover:underline ${focusRing}`}
          >
            ▸ كل القوائم
          </button>
          <div>
            <h2 className="text-xl font-bold">{openPlaylist.title}</h2>
            {openPlaylist.description && (
              <p className="mt-0.5 text-sm text-neutral-500">{openPlaylist.description}</p>
            )}
          </div>
          <LyricsGrid
            items={filterLyrics(playlistLyrics)}
            emptyText={query ? "لا توجد نتائج مطابقة لبحثك" : "هذه القائمة فارغة."}
          />
        </div>
      ) : me ? (
        me.playlists.length === 0 ? (
          <EmptyBox>لا توجد لديك قوائم بعد.</EmptyBox>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {me.playlists.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setOpenPlaylistId(p.id)}
                  className={`w-full rounded-xl border border-neutral-200 bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focusRing}`}
                >
                  <h2 className="truncate text-lg font-bold text-neutral-900">{p.title}</h2>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{p.description}</p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">{p.itemIds.length} نشيد</p>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <EmptyBox>سجّل الدخول وأنت متصل بالإنترنت لحفظ قوائمك للقراءة دون اتصال.</EmptyBox>
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

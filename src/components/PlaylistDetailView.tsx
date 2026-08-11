"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Eye,
  Globe,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { btnPrimary, btnSecondary, inputSm, focusRing } from "@/lib/ui";

interface Item {
  lyricsId: string;
  title: string;
  artist: string | null;
  album: string | null;
}

interface SearchResult {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
}

interface PlaylistData {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: Item[];
}

export function PlaylistDetailView({ playlist, shareUrl }: { playlist: PlaylistData; shareUrl: string }) {
  const [items, setItems] = useState(playlist.items);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/lyrics?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setResults(data.items ?? []))
        .catch(() => {
          if (!controller.signal.aborted) setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  async function addItem(result: SearchResult) {
    setAddingId(result.id);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyricsId: result.id }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.some((i) => i.lyricsId === result.id)
            ? prev
            : [...prev, { lyricsId: result.id, title: result.title, artist: result.artist, album: result.album }],
        );
      }
    } finally {
      setAddingId(null);
    }
  }

  async function togglePublic() {
    setBusy(true);
    const next = !isPublic;
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (res.ok) setIsPublic(next);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function persistOrder(next: Item[]) {
    await fetch(`/api/playlists/${playlist.id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((i) => i.lyricsId) }),
    });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    void persistOrder(next);
  }

  async function removeItem(lyricsId: string) {
    const res = await fetch(`/api/playlists/${playlist.id}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lyricsId }),
    });
    if (res.ok) setItems((prev) => prev.filter((i) => i.lyricsId !== lyricsId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/playlists" className={`inline-flex items-center gap-1 rounded-sm text-sm text-neutral-600 hover:text-emerald-700 ${focusRing}`}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" /> العودة إلى وصلاتي
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">{playlist.title}</h1>
        {playlist.description && <p className="mt-1 text-neutral-500">{playlist.description}</p>}
        <Link href={`/playlists/${playlist.id}/view`} className={`mt-2 inline-flex ${btnSecondary} px-3 py-1.5`}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          عرض الوصلة
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-700">المشاركة</p>
            <p className="text-xs text-neutral-500">
              {isPublic ? "أي شخص يملك الرابط يمكنه عرض هذه الوصلة." : "الوصلة خاصة بك حالياً."}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePublic}
            disabled={busy}
            className={isPublic ? btnSecondary : btnPrimary}
          >
            {isPublic ? (
              <Lock className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Globe className="h-4 w-4" aria-hidden="true" />
            )}
            {isPublic ? "إيقاف المشاركة" : "مشاركة عامة"}
          </button>
        </div>

        {isPublic && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              aria-label="رابط المشاركة"
              onFocus={(e) => e.target.select()}
              className={`min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 ${focusRing}`}
            />
            <button type="button" onClick={copyLink} className={`${btnSecondary} px-4 py-2`}>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "تم النسخ" : "نسخ الرابط"}
            </button>
            <Link href={`/p/${shareUrl.split("/p/")[1]}`} target="_blank" className={`${btnSecondary} px-4 py-2`}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              فتح
            </Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-neutral-700">إضافة نشيد إلى الوصلة</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن نشيد بالعنوان أو المنشد لإضافته..."
          aria-label="ابحث عن نشيد لإضافته إلى الوصلة"
          className={inputSm}
        />

        {query.trim() && (
          <div className="max-h-72 overflow-auto rounded-lg border border-neutral-100">
            {searching && results === null ? (
              <p className="p-3 text-sm text-neutral-500">جارٍ البحث…</p>
            ) : (
              (() => {
                const inPlaylist = new Set(items.map((i) => i.lyricsId));
                const visible = (results ?? []).filter((r) => !inPlaylist.has(r.id));
                if (visible.length === 0) {
                  return (
                    <p className="p-3 text-sm text-neutral-500">
                      {(results ?? []).length === 0 ? "لا توجد أناشيد مطابقة" : "كل النتائج مضافة إلى الوصلة"}
                    </p>
                  );
                }
                return (
                  <ul className="flex flex-col divide-y divide-neutral-100">
                    {visible.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 p-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.title}</p>
                          {r.artist && <p className="truncate text-xs text-emerald-700">{r.artist}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => addItem(r)}
                          disabled={addingId === r.id}
                          className={`${btnPrimary} shrink-0 px-3 py-1.5`}
                        >
                          {addingId === r.id ? (
                            "…"
                          ) : (
                            <>
                              <Plus className="h-4 w-4" aria-hidden="true" />
                              إضافة
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">الأناشيد ({items.length})</h2>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-neutral-500">
            الوصلة فارغة. ابحث عن نشيد بالأعلى لإضافته، أو استخدم زر «إضافة إلى وصلة» من صفحة أي نشيد.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li
                key={item.lyricsId}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-sm text-neutral-500">{index + 1}</span>
                  <div className="min-w-0">
                    <Link href={`/lyrics/${item.lyricsId}`} className={`block truncate rounded-sm font-medium hover:text-emerald-700 ${focusRing}`}>
                      {item.title}
                    </Link>
                    {item.artist && <p className="truncate text-xs text-emerald-700">{item.artist}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="تحريك لأعلى"
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 transition-colors hover:bg-neutral-50 disabled:opacity-30 ${focusRing}`}
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="تحريك لأسفل"
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 transition-colors hover:bg-neutral-50 disabled:opacity-30 ${focusRing}`}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.lyricsId)}
                    aria-label="إزالة من الوصلة"
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50 ${focusRing}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

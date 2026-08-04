"use client";

import Link from "next/link";
import { useState } from "react";

interface Item {
  lyricsId: string;
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
        <Link href="/playlists" className="text-sm text-neutral-500 hover:text-emerald-700">
          ← العودة إلى وصلاتي
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">{playlist.title}</h1>
        {playlist.description && <p className="mt-1 text-neutral-500">{playlist.description}</p>}
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
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              isPublic
                ? "border border-neutral-300 hover:bg-neutral-50"
                : "bg-emerald-700 text-white hover:bg-emerald-800"
            }`}
          >
            {isPublic ? "إيقاف المشاركة" : "مشاركة عامة"}
          </button>
        </div>

        {isPublic && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
            />
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              {copied ? "تم النسخ ✓" : "نسخ الرابط"}
            </button>
            <Link
              href={`/p/${shareUrl.split("/p/")[1]}`}
              target="_blank"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              فتح
            </Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">الأناشيد ({items.length})</h2>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-neutral-500">
            الوصلة فارغة. أضف أناشيد من صفحة أي نشيد عبر زر «إضافة إلى وصلة».
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li
                key={item.lyricsId}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-sm text-neutral-400">{index + 1}</span>
                  <div className="min-w-0">
                    <Link href={`/lyrics/${item.lyricsId}`} className="block truncate font-medium hover:text-emerald-700">
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
                    className="rounded-md border border-neutral-200 px-2 py-1 text-sm hover:bg-neutral-50 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="تحريك لأسفل"
                    className="rounded-md border border-neutral-200 px-2 py-1 text-sm hover:bg-neutral-50 disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.lyricsId)}
                    aria-label="إزالة"
                    className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    ✕
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

"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/lib/format";

interface PlaylistSummary {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  itemCount: number;
}

export function PlaylistsView({ initial }: { initial: PlaylistSummary[] }) {
  const [playlists, setPlaylists] = useState(initial);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر إنشاء القائمة");
        return;
      }
      setPlaylists((prev) => [
        { ...data.playlist, createdAt: data.playlist.createdAt, itemCount: 0 },
        ...prev,
      ]);
      setTitle("");
      setDescription("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه القائمة نهائياً؟")) return;
    const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (res.ok) setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">قوائمي</h1>

      <form
        onSubmit={createPlaylist}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <span className="text-sm font-semibold text-neutral-700">إنشاء قائمة جديدة</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="اسم القائمة"
          maxLength={120}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف اختياري"
          maxLength={500}
          rows={2}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="self-start rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? "جارٍ الإنشاء…" : "إنشاء"}
        </button>
      </form>

      {playlists.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          لا توجد قوائم بعد. أنشئ قائمتك الأولى بالأعلى.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <Link href={`/playlists/${p.id}`} className="text-lg font-bold hover:text-emerald-700">
                  {p.title}
                </Link>
                {p.description && <p className="mt-0.5 text-sm text-neutral-500">{p.description}</p>}
                <p className="mt-1 text-xs text-neutral-400">
                  {p.itemCount} نشيد · {formatDate(new Date(p.createdAt))} ·{" "}
                  {p.isPublic ? (
                    <span className="text-emerald-700">عامة</span>
                  ) : (
                    <span>خاصة</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/playlists/${p.id}`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  إدارة
                </Link>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

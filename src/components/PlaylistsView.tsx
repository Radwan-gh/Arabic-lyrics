"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { inputSm, btnPrimary, btnSecondary, btnDanger, focusRing } from "@/lib/ui";

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
        setError(data.error ?? "تعذّر إنشاء الوصلة");
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
    if (!confirm("حذف هذه الوصلة نهائياً؟")) return;
    const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (res.ok) setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">وصلاتي</h1>

      <form
        onSubmit={createPlaylist}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <span className="text-sm font-semibold text-neutral-700">إنشاء وصلة جديدة</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="اسم الوصلة"
          aria-label="اسم الوصلة"
          maxLength={120}
          required
          className={inputSm}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف اختياري"
          aria-label="وصف الوصلة"
          maxLength={500}
          rows={2}
          className={inputSm}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !title.trim()} className={`${btnPrimary} self-start`}>
          {busy ? "جارٍ الإنشاء…" : "إنشاء"}
        </button>
      </form>

      {playlists.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          لا توجد وصلات بعد. أنشئ وصلتك الأولى بالأعلى.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <Link href={`/playlists/${p.id}`} className={`rounded-sm text-lg font-bold hover:text-emerald-700 ${focusRing}`}>
                  {p.title}
                </Link>
                {p.description && <p className="mt-0.5 text-sm text-neutral-500">{p.description}</p>}
                <p className="mt-1 text-xs text-neutral-500">
                  {p.itemCount} نشيد · {formatDate(new Date(p.createdAt))} ·{" "}
                  {p.isPublic ? (
                    <span className="font-medium text-emerald-700">عامة</span>
                  ) : (
                    <span>خاصة</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/playlists/${p.id}`} className={`${btnSecondary} px-3 py-1.5`}>
                  إدارة
                </Link>
                <button type="button" onClick={() => remove(p.id)} className={`${btnDanger} px-3 py-1.5`}>
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

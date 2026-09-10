"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, ListMusic, Globe, Lock, Plus, X } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { MenuButton } from "@/components/MenuButton";
import { focusRing } from "@/lib/ui";

interface PlaylistSummary {
  id: string;
  title: string;
  itemCount: number;
  isPublic: boolean;
}

/** شاشة «وصلاتي» الغامرة على الموبايل: قائمة صفوف تنتقل إلى إدارة كل وصلة، وزرّ
 * عائم لإنشاء وصلة جديدة (لوح منبثق مصغّر — لا شاشة إنشاء منفصلة في التصميم). */
export function PlaylistsScreen({ initial }: { initial: PlaylistSummary[] }) {
  const router = useRouter();
  const [playlists, setPlaylists] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setPlaylists((prev) => [{ id: data.playlist.id, title: data.playlist.title, itemCount: 0, isPublic: false }, ...prev]);
      setTitle("");
      setDescription("");
      setCreateOpen(false);
      router.push(`/playlists/${data.playlist.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center gap-2 px-3 pb-3 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="text-xl font-extrabold">وصلاتي</span>
        <div className="flex-1" />
        <MenuButton />
      </header>

      <div className="flex-1 px-5 pb-24">
        {playlists.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#d9d9d3] p-8 text-center text-sm text-[#6b7670]">
            لا توجد وصلات بعد. أنشئ وصلتك الأولى بزر + بالأسفل.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {playlists.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/playlists/${p.id}`}
                  className={`flex items-center gap-3.5 rounded-2xl border border-[#e6e6e1] bg-white p-4 ${focusRing}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${p.isPublic ? "bg-[#ecfdf5] text-emerald-700" : "bg-[#f2f2ee] text-[#5c6660]"}`}>
                    <ListMusic className="h-[22px] w-[22px]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold">{p.title}</div>
                    <div className="mt-0.5 text-sm text-[#6b7670]">{p.itemCount.toLocaleString("ar-EG")} نشيداً</div>
                  </div>
                  {p.isPublic ? (
                    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#ecfdf5] px-2.5 text-xs font-semibold text-emerald-700">
                      <Globe className="h-[13px] w-[13px]" aria-hidden="true" />
                      عامة
                    </span>
                  ) : (
                    <Lock className="h-[18px] w-[18px] shrink-0 text-[#c3c9c5]" aria-hidden="true" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="absolute bottom-7 start-5 inline-flex h-[60px] items-center gap-2 rounded-full bg-emerald-700 px-[22px] text-base font-semibold text-white shadow-[0_10px_24px_rgba(4,120,87,0.35)]"
      >
        <Plus className="h-[22px] w-[22px]" aria-hidden="true" />
        وصلة جديدة
      </button>

      {createOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="وصلة جديدة">
          <button type="button" aria-label="إغلاق" onClick={() => setCreateOpen(false)} className="absolute inset-0 bg-[#14211c]/30" />
          <form
            onSubmit={createPlaylist}
            className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-3xl bg-white px-6 pb-8 pt-2.5 shadow-2xl"
          >
            <span aria-hidden="true" className="mx-auto h-1.5 w-11 rounded-full bg-neutral-200" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold">وصلة جديدة</span>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="إغلاق" className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 ${focusRing}`}>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اسم الوصلة"
              aria-label="اسم الوصلة"
              maxLength={120}
              required
              autoFocus
              className="h-12 rounded-2xl border border-[#e6e6e1] bg-white px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف اختياري"
              aria-label="وصف الوصلة"
              maxLength={500}
              rows={2}
              className="rounded-2xl border border-[#e6e6e1] bg-white px-3.5 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy || !title.trim()} className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-emerald-700 text-base font-bold text-white disabled:opacity-60">
              {busy ? <Spinner label="جارٍ الإنشاء…" /> : "حفظ"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

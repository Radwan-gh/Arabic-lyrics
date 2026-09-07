"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ListPlus, Check, X, Plus } from "lucide-react";
import { Spinner } from "./Spinner";
import { btnSecondary, focusRing } from "@/lib/ui";

interface PlaylistOption {
  id: string;
  title: string;
  itemCount: number;
}

export function AddToPlaylist({ lyricsId, variant = "button" }: { lyricsId: string; variant?: "button" | "plain" }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistOption[] | null>(null);
  const [status, setStatus] = useState<Record<string, "adding" | "added" | "error">>({});
  const [creating, setCreating] = useState(false);
  const [showCreateField, setShowCreateField] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/playlists")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) =>
        setPlaylists(
          (data.playlists ?? []).map((p: { id: string; title: string; _count?: { items: number } }) => ({
            id: p.id,
            title: p.title,
            itemCount: p._count?.items ?? 0,
          })),
        ),
      )
      .catch(() => setPlaylists([]));
  }

  useEffect(() => {
    if (!open || playlists !== null) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playlists]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function add(playlistId: string) {
    setStatus((s) => ({ ...s, [playlistId]: "adding" }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyricsId }),
      });
      setStatus((s) => ({ ...s, [playlistId]: res.ok ? "added" : "error" }));
    } catch {
      setStatus((s) => ({ ...s, [playlistId]: "error" }));
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlaylists((prev) => [{ id: data.playlist.id, title: data.playlist.title, itemCount: 0 }, ...(prev ?? [])]);
        setNewTitle("");
        setShowCreateField(false);
        await add(data.playlist.id);
      }
    } finally {
      setCreating(false);
    }
  }

  function StatusMark({ playlistId }: { playlistId: string }) {
    const st = status[playlistId];
    if (st === "added") return <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />;
    if (st === "adding") return <span className="shrink-0 text-neutral-400">…</span>;
    if (st === "error") return <X className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />;
    return null;
  }

  const body =
    playlists === null ? (
      <div className="p-2 text-sm text-neutral-500">
        <Spinner label="جارٍ التحميل…" />
      </div>
    ) : playlists.length === 0 ? (
      <div className="p-2 text-sm text-neutral-500">
        لا توجد وصلات بعد.{" "}
        <Link href="/playlists" className={`rounded-sm text-emerald-700 hover:underline ${focusRing}`}>
          أنشئ وصلة
        </Link>
      </div>
    ) : (
      <ul className="flex flex-col">
        {playlists.map((p) => {
          const st = status[p.id];
          return (
            <li key={p.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => add(p.id)}
                disabled={st === "adding" || st === "added"}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm hover:bg-neutral-100 disabled:opacity-60 ${focusRing}`}
              >
                <span className="truncate">{p.title}</span>
                <StatusMark playlistId={p.id} />
              </button>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="إضافة إلى وصلة"
        title="إضافة إلى وصلة"
        className={
          variant === "plain"
            ? `inline-flex h-11 w-11 items-center justify-center rounded-xl bg-transparent text-[#3c4a44] transition-colors hover:bg-black/5 ${focusRing}`
            : `${btnSecondary} h-11 w-11 !p-0`
        }
      >
        <ListPlus className="h-6 w-6" aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* سطح المكتب: لوح منسدل صغير بجانب الزر. */}
          <div role="menu" className="absolute z-10 mt-1 hidden max-h-72 w-64 overflow-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg sm:block">
            {body}
          </div>

          {/* الموبايل: لوح منبثق من الأسفل (bottom sheet). */}
          <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="إضافة إلى وصلة">
            <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#14211c]/30" />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col gap-3.5 overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-2.5 shadow-2xl">
              <span aria-hidden="true" className="mx-auto h-1.5 w-11 rounded-full bg-neutral-200" />
              <span className="text-lg font-extrabold text-[#14211c]">إضافة إلى وصلة</span>

              {playlists === null ? (
                <div className="p-2 text-sm text-neutral-500">
                  <Spinner label="جارٍ التحميل…" />
                </div>
              ) : (
                <ul className="flex flex-col">
                  {playlists.map((p) => {
                    const st = status[p.id];
                    const checked = st === "added";
                    return (
                      <li key={p.id} className="border-b border-[#f0f0ec] last:border-0">
                        <button
                          type="button"
                          onClick={() => add(p.id)}
                          disabled={st === "adding" || checked}
                          className={`flex w-full items-center gap-3 py-3.5 text-start disabled:opacity-100 ${focusRing}`}
                        >
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                              checked ? "bg-emerald-700 text-white" : "border-[1.5px] border-[#d6dad7]"
                            }`}
                          >
                            {checked && <Check className="h-[15px] w-[15px]" strokeWidth={3} aria-hidden="true" />}
                          </span>
                          <span className="flex-1">
                            <span className="block text-base font-bold text-[#14211c]">{p.title}</span>
                            <span className="block text-[13px] text-[#6b7670]">
                              {(p.itemCount + (checked ? 1 : 0)).toLocaleString("ar-EG")} نشيداً
                            </span>
                          </span>
                          {st === "adding" && <span className="shrink-0 text-neutral-400">…</span>}
                          {st === "error" && <X className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form onSubmit={createAndAdd} className="flex flex-col gap-2">
                {showCreateField && (
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="اسم الوصلة"
                    aria-label="اسم الوصلة الجديدة"
                    disabled={creating}
                    className="h-12 rounded-2xl border border-[#e6e6e1] bg-white px-3.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                )}
                <button
                  type={showCreateField ? "submit" : "button"}
                  onClick={() => !showCreateField && setShowCreateField(true)}
                  disabled={creating}
                  className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl border border-dashed border-[#c8d1cc] bg-white text-base font-semibold text-emerald-700 disabled:opacity-60"
                >
                  <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                  {creating ? <Spinner label="جارٍ الإنشاء…" /> : "وصلة جديدة"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-emerald-700 text-base font-bold text-white"
              >
                حفظ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

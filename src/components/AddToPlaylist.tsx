"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ListPlus, Check, X } from "lucide-react";
import { btnSecondary, focusRing } from "@/lib/ui";

interface PlaylistOption {
  id: string;
  title: string;
}

export function AddToPlaylist({ lyricsId }: { lyricsId: string }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistOption[] | null>(null);
  const [status, setStatus] = useState<Record<string, "adding" | "added" | "error">>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || playlists !== null) return;
    fetch("/api/playlists")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setPlaylists(data.playlists ?? []))
      .catch(() => setPlaylists([]));
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="إضافة إلى وصلة"
        title="إضافة إلى وصلة"
        className={`${btnSecondary} h-11 w-11 !p-0`}
      >
        <ListPlus className="h-6 w-6" aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute z-10 mt-1 max-h-72 w-64 overflow-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
          {playlists === null ? (
            <p className="p-2 text-sm text-neutral-500">جارٍ التحميل…</p>
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
                      {st === "added" ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      ) : st === "adding" ? (
                        <span className="shrink-0 text-neutral-400">…</span>
                      ) : st === "error" ? (
                        <X className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

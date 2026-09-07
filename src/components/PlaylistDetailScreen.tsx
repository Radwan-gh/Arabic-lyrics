"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Play,
  Plus,
  Upload,
  MoreVertical,
  Globe,
  Lock,
  Copy,
  Check,
  ExternalLink,
  GripVertical,
  X,
} from "lucide-react";
import { useReorderableList } from "@/lib/use-reorderable-list";
import { useDragReorder } from "@/lib/use-drag-reorder";
import { focusRing } from "@/lib/ui";

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
}

interface PlaylistDetailScreenProps {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: Item[];
  shareUrl: string;
}

const REMOVE_WIDTH = 72;

/** شاشة إدارة الوصلة الغامرة على الموبايل: تنقّل بالسحب للترتيب (مقبض) وللإزالة
 * (سحب الصف لليسار). سطح المكتب يبقى على PlaylistDetailView الحالي دون تغيير. */
export function PlaylistDetailScreen({ id, title, description, isPublic: initialPublic, items: initialItems, shareUrl }: PlaylistDetailScreenProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const persist = (order: string[]) => {
    fetch(`/api/playlists/${id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }).catch(() => {});
  };

  const { items, move } = useReorderableList(initialItems, (i) => i.lyricsId, persist);
  const { draggingIndex, offsetY, startDrag, onDragMove, endDrag, onKeyDown } = useDragReorder(items.length, move);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (moreOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/lyrics?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setResults(data.items ?? []))
        .catch(() => {
          if (!controller.signal.aborted) setResults([]);
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  async function togglePublic() {
    setBusy(true);
    const next = !isPublic;
    try {
      const res = await fetch(`/api/playlists/${id}`, {
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
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // تجاهُل الإغلاق/الفشل والانتقال للنسخ.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* الحافظة غير متاحة */
    }
  }

  async function addItem(result: SearchResult) {
    setAddingId(result.id);
    try {
      const res = await fetch(`/api/playlists/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyricsId: result.id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setAddingId(null);
    }
  }

  async function removeItem(lyricsId: string) {
    const res = await fetch(`/api/playlists/${id}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lyricsId }),
    });
    if (res.ok) router.refresh();
  }

  const inPlaylist = new Set(items.map((i) => i.lyricsId));
  const visibleResults = (results ?? []).filter((r) => !inPlaylist.has(r.id));

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center justify-between px-3 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <div className="flex gap-0.5">
          <button type="button" onClick={copyLink} aria-label="مشاركة الوصلة" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
            {copied ? <Check className="h-5 w-5 text-emerald-700" aria-hidden="true" /> : <Upload className="h-5 w-5" aria-hidden="true" />}
          </button>
          <div className="relative" ref={moreRef}>
            <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-haspopup="menu" aria-expanded={moreOpen} aria-label="المزيد" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
            {moreOpen && (
              <div role="menu" className="absolute end-0 top-full z-10 mt-1 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={togglePublic}
                  disabled={busy}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-neutral-50 ${focusRing}`}
                >
                  {isPublic ? <Lock className="h-4 w-4 text-neutral-500" aria-hidden="true" /> : <Globe className="h-4 w-4 text-neutral-500" aria-hidden="true" />}
                  {isPublic ? "إيقاف المشاركة" : "مشاركة عامة"}
                </button>
                {isPublic && (
                  <>
                    <button type="button" onClick={copyLink} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-neutral-50 ${focusRing}`}>
                      <Copy className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                      نسخ رابط المشاركة
                    </button>
                    <Link href={`/p/${shareUrl.split("/p/")[1]}`} target="_blank" className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-neutral-50 ${focusRing}`}>
                      <ExternalLink className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                      فتح الرابط
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-5 pb-4 pt-1">
        <h1 className="text-[26px] font-extrabold">{title}</h1>
        <div className="mt-1 text-sm text-[#6b7670]">
          {items.length.toLocaleString("ar-EG")} نشيداً · {isPublic ? "عامة · رابط مشاركة فعّال" : "خاصة"}
        </div>
        {description && <p className="mt-1 text-sm text-[#6b7670]">{description}</p>}
        <div className="mt-3.5 flex gap-2">
          {items.length > 0 ? (
            <Link
              href={`/lyrics/${items[0].lyricsId}?playlist=${id}`}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-base font-semibold text-white"
            >
              <Play className="h-[18px] w-[18px] fill-current" aria-hidden="true" />
              ابدأ العرض
            </Link>
          ) : (
            <span className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-neutral-200 text-base font-semibold text-neutral-400">
              ابدأ العرض
            </span>
          )}
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            aria-expanded={addOpen}
            aria-label="إضافة نشيد إلى الوصلة"
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e6e6e1] bg-white text-[#3c4a44] ${focusRing}`}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {addOpen && (
          <div className="mt-3 rounded-2xl border border-[#e6e6e1] bg-white p-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن نشيد بالعنوان أو المنشد..."
              aria-label="ابحث عن نشيد لإضافته إلى الوصلة"
              className="h-11 w-full rounded-xl border border-[#e6e6e1] bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            {query.trim() && (
              <ul className="mt-2 flex max-h-56 flex-col divide-y divide-[#f0f0ec] overflow-y-auto">
                {visibleResults.length === 0 ? (
                  <li className="p-2.5 text-sm text-[#6b7670]">لا نتائج</li>
                ) : (
                  visibleResults.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.title}</p>
                        {r.artist && <p className="truncate text-xs text-emerald-700">{r.artist}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => addItem(r)}
                        disabled={addingId === r.id}
                        className={`shrink-0 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${focusRing}`}
                      >
                        إضافة
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 border-t border-[#e6e6e1] bg-white">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#6b7670]">الوصلة فارغة. استخدم زر + بالأعلى لإضافة أناشيد.</p>
        ) : (
          <>
            {items.map((item, index) => (
              <PlaylistRow
                key={item.lyricsId}
                item={item}
                index={index}
                dragging={draggingIndex === index}
                dragOffsetY={offsetY}
                onDragStart={(e) => startDrag(index, e)}
                onDragMove={onDragMove}
                onDragEnd={endDrag}
                onDragKeyDown={(e) => onKeyDown(index, e)}
                onRemove={() => removeItem(item.lyricsId)}
              />
            ))}
            <p className="px-4 py-3.5 text-[13px] text-[#8a938d]">اسحب العنصر لليسار للإزالة · اسحب المقبض للترتيب</p>
          </>
        )}
      </div>
    </div>
  );
}

function PlaylistRow({
  item,
  index,
  dragging,
  dragOffsetY,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragKeyDown,
  onRemove,
}: {
  item: Item;
  index: number;
  dragging: boolean;
  dragOffsetY: number;
  onDragStart: (e: React.PointerEvent<HTMLElement>) => void;
  onDragMove: (e: React.PointerEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragKeyDown: (e: React.KeyboardEvent) => void;
  onRemove: () => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef<number | null>(null);
  const swiping = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0]?.clientX ?? null;
    swiping.current = true;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!swiping.current || startX.current === null) return;
    const dx = (e.touches[0]?.clientX ?? startX.current) - startX.current;
    // اسحب لليسار فقط (dx سالب) لكشف زر الإزالة، بحدّ أقصى عرض الزر.
    setSwipeX(Math.max(-REMOVE_WIDTH, Math.min(0, dx)));
  }
  function onTouchEnd() {
    swiping.current = false;
    setSwipeX((x) => (x < -REMOVE_WIDTH / 2 ? -REMOVE_WIDTH : 0));
  }

  return (
    <div
      data-drag-row
      className="relative overflow-hidden border-b border-[#f0f0ec]"
      style={dragging ? { transform: `translateY(${dragOffsetY}px)`, position: "relative", zIndex: 10, background: "#fbfbf9", boxShadow: "0 6px 16px rgba(20,33,28,0.08)" } : undefined}
    >
      <button
        type="button"
        onClick={onRemove}
        aria-label="إزالة من الوصلة"
        className="absolute inset-y-0 end-0 flex items-center justify-center bg-red-600 text-sm font-semibold text-white"
        style={{ width: REMOVE_WIDTH }}
      >
        <X className="h-4 w-4 me-1" aria-hidden="true" />
        إزالة
      </button>
      <div
        className="flex min-h-16 items-center gap-3 bg-white px-4 py-3 transition-transform"
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span className="w-6 shrink-0 text-center text-sm text-[#9aa39d]">{(index + 1).toLocaleString("ar-EG")}</span>
        <Link href={`/lyrics/${item.lyricsId}`} className={`min-w-0 flex-1 rounded-sm ${focusRing}`}>
          <div className="truncate text-[17px] font-bold">{item.title}</div>
          {item.artist && <div className="mt-0.5 truncate text-[13px] text-[#6b7670]">{item.artist}</div>}
        </Link>
        <button
          type="button"
          aria-label="إعادة ترتيب — اسحب أو استخدم مفاتيح الأسهم"
          className={`inline-flex h-11 w-6 shrink-0 items-center justify-center text-[#c3c9c5] ${dragging ? "text-emerald-700" : ""} ${focusRing}`}
          style={{ touchAction: "none" }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onKeyDown={onDragKeyDown}
        >
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

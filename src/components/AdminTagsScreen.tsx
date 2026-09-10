"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Search, Pencil, Trash2 } from "lucide-react";
import { MenuButton } from "@/components/MenuButton";
import { focusRing } from "@/lib/ui";

interface TagRow {
  tag: string;
  count: number;
}

/** شاشة «إدارة الوسوم» الغامرة على الموبايل: بحث + قائمة صفوف بأزرار تعديل/حذف،
 * وصفّ تحرير مضمّن للتسمية. سطح المكتب يبقى على TagTable (جدول) دون تغيير. */
export function AdminTagsScreen({ initialTags }: { initialTags: TagRow[] }) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [query, setQuery] = useState("");
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startRename(tag: string) {
    setEditingTag(tag);
    setDraft(tag);
  }

  async function submitRename(tag: string) {
    const newTag = draft.trim();
    if (!newTag || newTag === tag) {
      setEditingTag(null);
      return;
    }
    setBusyTag(tag);
    const res = await fetch("/api/admin/tags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, newTag }),
    });
    setBusyTag(null);
    setEditingTag(null);
    if (!res.ok) {
      alert("تعذر إعادة تسمية الوسم");
      return;
    }
    setTags((prev) => {
      const merged = new Map<string, number>();
      for (const row of prev) {
        const key = row.tag === tag ? newTag : row.tag;
        merged.set(key, (merged.get(key) ?? 0) + row.count);
      }
      return Array.from(merged.entries())
        .map(([t, count]) => ({ tag: t, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    });
  }

  async function deleteTag(tag: string) {
    if (!confirm(`هل أنت متأكد من حذف الوسم "${tag}" من جميع الأناشيد؟`)) return;
    setBusyTag(tag);
    const res = await fetch(`/api/admin/tags?tag=${encodeURIComponent(tag)}`, { method: "DELETE" });
    setBusyTag(null);
    if (!res.ok) {
      alert("تعذر حذف الوسم");
      return;
    }
    setTags((prev) => prev.filter((row) => row.tag !== tag));
  }

  const q = query.trim().toLowerCase();
  const visible = q ? tags.filter((row) => row.tag.toLowerCase().includes(q)) : tags;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center gap-2 px-3 pb-3 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="text-xl font-extrabold">إدارة الوسوم</span>
        <div className="flex-1" />
        <MenuButton />
      </header>

      <div className="px-5 pb-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-[14px] my-auto h-5 w-5 text-[#9aa39d]" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن وسم..."
            aria-label="ابحث عن وسم"
            className="h-12 w-full rounded-2xl border border-[#e6e6e1] bg-white ps-[44px] pe-3.5 text-base text-[#14211c] placeholder:text-[#9aa39d] focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="flex-1 border-t border-[#e6e6e1] bg-white">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#6b7670]">{q ? "لا وسوم مطابقة" : "لا توجد وسوم بعد"}</p>
        ) : (
          visible.map((row) => {
            const busy = busyTag === row.tag;
            const editing = editingTag === row.tag;
            return (
              <div
                key={row.tag}
                className={`flex min-h-16 items-center gap-2.5 border-b border-[#f0f0ec] px-5 py-3 ${editing ? "bg-[#fbfbf9]" : ""} ${busy ? "opacity-50" : ""}`}
              >
                {editing ? (
                  <>
                    <input
                      autoFocus
                      value={draft}
                      aria-label={`إعادة تسمية الوسم ${row.tag}`}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename(row.tag);
                        if (e.key === "Escape") setEditingTag(null);
                      }}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-emerald-700 bg-white px-3 text-base text-[#14211c] focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitRename(row.tag)}
                      className="h-11 shrink-0 rounded-xl bg-emerald-700 px-4 text-[15px] font-semibold text-white disabled:opacity-50"
                    >
                      حفظ
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[17px] font-bold">{row.tag}</div>
                      <div className="mt-0.5 text-[13px] text-[#6b7670]">{row.count.toLocaleString("ar-EG")} نشيداً</div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startRename(row.tag)}
                      aria-label={`إعادة تسمية ${row.tag}`}
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#3c4a44] disabled:opacity-50 ${focusRing}`}
                    >
                      <Pencil className="h-[19px] w-[19px]" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteTag(row.tag)}
                      aria-label={`حذف ${row.tag}`}
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#c0736e] disabled:opacity-50 ${focusRing}`}
                    >
                      <Trash2 className="h-[19px] w-[19px]" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
        <p className="px-5 py-3.5 text-[13px] leading-[1.8] text-[#8a938d]">
          إعادة التسمية تُحدّث كل الأناشيد المرتبطة. الحذف يزيل الوسم منها جميعاً.
        </p>
      </div>
    </div>
  );
}

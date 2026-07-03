"use client";

import { useState } from "react";

interface TagRow {
  tag: string;
  count: number;
}

export function TagTable({ initialTags }: { initialTags: TagRow[] }) {
  const [tags, setTags] = useState(initialTags);
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
    if (!confirm(`هل أنت متأكد من حذف الوسم "${tag}" من جميع الكلمات؟`)) return;

    setBusyTag(tag);
    const res = await fetch(`/api/admin/tags?tag=${encodeURIComponent(tag)}`, { method: "DELETE" });
    setBusyTag(null);

    if (!res.ok) {
      alert("تعذر حذف الوسم");
      return;
    }

    setTags((prev) => prev.filter((row) => row.tag !== tag));
  }

  if (tags.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
        لا توجد وسوم بعد
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            <th className="px-4 py-3 text-start font-medium">الوسم</th>
            <th className="px-4 py-3 text-start font-medium">عدد الكلمات</th>
            <th className="px-4 py-3 text-start font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tags.map((row) => (
            <tr key={row.tag} className={busyTag === row.tag ? "opacity-50" : ""}>
              <td className="px-4 py-3">
                {editingTag === row.tag ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename(row.tag);
                      if (e.key === "Escape") setEditingTag(null);
                    }}
                    className="rounded-md border border-neutral-300 px-2 py-1"
                  />
                ) : (
                  <span>#{row.tag}</span>
                )}
              </td>
              <td className="px-4 py-3">{row.count}</td>
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  {editingTag === row.tag ? (
                    <>
                      <button
                        type="button"
                        disabled={busyTag === row.tag}
                        onClick={() => submitRename(row.tag)}
                        className="text-emerald-700 hover:underline"
                      >
                        حفظ
                      </button>
                      <button type="button" onClick={() => setEditingTag(null)} className="text-neutral-500 hover:underline">
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busyTag === row.tag}
                      onClick={() => startRename(row.tag)}
                      className="text-neutral-600 hover:underline"
                    >
                      إعادة تسمية
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyTag === row.tag}
                    onClick={() => deleteTag(row.tag)}
                    className="text-red-600 hover:underline"
                  >
                    حذف
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

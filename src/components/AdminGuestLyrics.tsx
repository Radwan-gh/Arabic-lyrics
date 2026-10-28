"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { MenuButton } from "@/components/MenuButton";
import { focusRing } from "@/lib/ui";
import { formatDate } from "@/lib/format";

export interface GuestLyricsRow {
  id: string;
  title: string;
  artist: string | null;
  createdAt: string;
}

/** «أناشيد الزوار»: الأناشيد المُضافة دون تسجيل دخول (بلا createdById)، ولا
 * يعدّلها أو يحذفها إلا المدير. «اعتماد» يُبقيها منشورة ويُخرجها من القائمة. حالة واحدة تغذّي شاشة الموبايل الغامرة وجدول
 * سطح المكتب معًا، على نمط إدارة الوسوم والمستخدمين. */
export function AdminGuestLyrics({ initialLyrics }: { initialLyrics: GuestLyricsRow[] }) {
  const router = useRouter();
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approveLyrics(row: GuestLyricsRow) {
    setBusyId(row.id);
    const res = await fetch(`/api/admin/guest-lyrics/${row.id}`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      alert("تعذر اعتماد الأنشودة");
      return;
    }
    setLyrics((prev) => prev.filter((l) => l.id !== row.id));
  }

  async function deleteLyrics(row: GuestLyricsRow) {
    if (!confirm(`هل أنت متأكد من حذف الأنشودة "${row.title}"؟`)) return;
    setBusyId(row.id);
    const res = await fetch(`/api/lyrics/${row.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      alert("حدث خطأ أثناء الحذف");
      return;
    }
    setLyrics((prev) => prev.filter((l) => l.id !== row.id));
  }

  const meta = (row: GuestLyricsRow) => [row.artist, formatDate(new Date(row.createdAt))].filter(Boolean).join(" · ");
  const empty = "لا توجد أناشيد زوار بانتظار المراجعة";

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c] sm:hidden">
        <header className="flex items-center gap-2 px-3 pb-3 pt-2">
          <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
            <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
          <span className="text-xl font-extrabold">أناشيد الزوار</span>
          <div className="flex-1" />
          <MenuButton />
        </header>

        <div className="flex-1 border-t border-[#e6e6e1] bg-white">
          {lyrics.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6b7670]">{empty}</p>
          ) : (
            lyrics.map((row) => (
              <div key={row.id} className={`flex min-h-16 items-center gap-2.5 border-b border-[#f0f0ec] px-5 py-3 ${busyId === row.id ? "opacity-50" : ""}`}>
                <Link href={`/lyrics/${row.id}`} className={`min-w-0 flex-1 rounded-sm ${focusRing}`}>
                  <div className="truncate text-[17px] font-bold">{row.title}</div>
                  <div className="mt-0.5 truncate text-[13px] text-[#6b7670]">{meta(row)}</div>
                </Link>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => approveLyrics(row)}
                  aria-label={`اعتماد ${row.title}`}
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-emerald-700 disabled:opacity-50 ${focusRing}`}
                >
                  <Check className="h-[21px] w-[21px]" aria-hidden="true" />
                </button>
                <Link
                  href={`/lyrics/${row.id}/edit`}
                  aria-label={`تعديل ${row.title}`}
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}
                >
                  <Pencil className="h-[19px] w-[19px]" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => deleteLyrics(row)}
                  aria-label={`حذف ${row.title}`}
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#c0736e] disabled:opacity-50 ${focusRing}`}
                >
                  <Trash2 className="h-[19px] w-[19px]" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="hidden sm:block">
        <h1 className="mb-1 text-xl font-bold">أناشيد الزوار</h1>
        <p className="mb-4 text-sm text-neutral-600">الأناشيد المُضافة دون تسجيل دخول. عدّلها أو احذفها، أو اعتمدها لتخرج من القائمة وتبقى منشورة.</p>
        {lyrics.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">{empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">العنوان</th>
                  <th className="px-4 py-3 text-start font-medium">المنشد</th>
                  <th className="px-4 py-3 text-start font-medium">تاريخ الإضافة</th>
                  <th className="px-4 py-3 text-start font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {lyrics.map((row) => (
                  <tr key={row.id} className={busyId === row.id ? "opacity-50" : ""}>
                    <td className="px-4 py-3">
                      <Link href={`/lyrics/${row.id}`} className={`rounded-sm font-medium text-neutral-900 hover:text-emerald-700 ${focusRing}`}>
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{row.artist || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(new Date(row.createdAt))}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => approveLyrics(row)}
                          className={`inline-flex items-center gap-1 rounded-sm font-medium text-emerald-700 hover:underline disabled:opacity-50 ${focusRing}`}
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          اعتماد
                        </button>
                        <Link href={`/lyrics/${row.id}/edit`} className={`inline-flex items-center gap-1 rounded-sm text-neutral-600 hover:underline ${focusRing}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          تعديل
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => deleteLyrics(row)}
                          className={`inline-flex items-center gap-1 rounded-sm text-red-600 hover:underline disabled:opacity-50 ${focusRing}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

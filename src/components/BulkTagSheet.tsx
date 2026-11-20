"use client";

import { useState } from "react";
import { TagPickerPanel } from "./TagPickerPanel";
import { rememberTag } from "@/lib/use-tag-suggestions";
import { tagKey } from "@/lib/tag-rules";
import { focusRing } from "@/lib/ui";

interface BulkTagSheetProps {
  ids: string[];
  onClose: () => void;
  /** يُستدعى لكل نشيد عُدِّل بوسومه الجديدة كما أعادها الخادم. */
  onUpdated: (updates: { id: string; tags: string[] }[]) => void;
}

/**
 * لوح سفلي لإضافة وسم لعدة أناشيد محدَّدة دفعة واحدة (وضع التحديد في القائمة).
 * كل نقرة على وسم تُضاف فورًا لكل المحدَّد، وتظهر النتيجة (مثل «تم على 5 من 7»).
 * الإضافة فقط هنا؛ الإزالة من الأنشودة نفسها.
 */
export function BulkTagSheet({ ids, onClose, onUpdated }: BulkTagSheetProps) {
  const [applied, setApplied] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const total = ids.length.toLocaleString("ar-EG");

  async function add(tag: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/lyrics/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, add: [tag] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "تعذّر إضافة الوسم");
      const updated: { id: string; tags: string[] }[] = data.updated ?? [];
      const failed: { reason: string }[] = data.failed ?? [];
      onUpdated(updated);
      // بالصيغة المحفوظة (قد يكون الخادم وحّدها مع وسم موجود).
      const saved = updated[0]?.tags.find((t) => tagKey(t) === tagKey(tag)) ?? tag;
      rememberTag(saved, updated.length);
      setApplied((prev) => [...prev, tag]);
      const done = updated.length.toLocaleString("ar-EG");
      if (failed.length === 0) {
        setStatus(`أُضيف «${tag}» إلى ${done} من ${total}`);
      } else {
        const limit = failed.filter((f) => f.reason === "limit").length;
        setStatus(
          `أُضيف «${tag}» إلى ${done} من ${total}` +
            (limit > 0 ? ` — ${limit.toLocaleString("ar-EG")} بلغت الحد الأقصى للوسوم` : " — بعضها لا تملك تعديله"),
        );
      }
    } catch (e) {
      setError(e instanceof TypeError ? "تعذّر الحفظ — تحقق من الاتصال" : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="وسم الأناشيد المحدَّدة">
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-[#14211c]/30" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-2.5 shadow-2xl">
        <span aria-hidden="true" className="mx-auto h-1.5 w-11 rounded-full bg-neutral-200" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-extrabold text-[#14211c]">وسم {total} نشيدًا</span>
          <button type="button" onClick={onClose} className={`rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 ${focusRing}`}>
            تم
          </button>
        </div>
        <TagPickerPanel
          mode="bulk"
          selected={applied}
          onToggle={add}
          error={error}
          status={status}
          busy={busy}
          onClose={onClose}
          touch
        />
      </div>
    </div>
  );
}

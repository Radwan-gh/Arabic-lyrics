"use client";

import { Sun, Moon } from "lucide-react";
import { btnSecondary } from "@/lib/ui";
import { useKeepScreenAwake } from "@/lib/use-keep-screen-awake";

// ─────────────────────────────────────────────────────────────────────────────
// زرّ «إبقاء الشاشة مضيئة» لصفحة الأنشودة: يمنع الموبايل من إطفاء الشاشة أثناء القراءة
// عبر واجهة Screen Wake Lock (المنطق في lib/use-keep-screen-awake.ts، مشترك مع مفتاح
// التبديل في لوح ضبط القراءة على الموبايل). يبدأ مطفأً في كل زيارة، لكن يُحفظ آخر اختيار
// في localStorage ويُعاد تطبيقه تلقائيًا في الأناشيد التالية. يختفي كليًا على المتصفحات
// غير المدعومة.
// ─────────────────────────────────────────────────────────────────────────────

export function KeepScreenAwake({ className = "" }: { className?: string }) {
  const { supported, enabled, toggle } = useKeepScreenAwake();

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "إيقاف إبقاء الشاشة مضيئة" : "إبقاء الشاشة مضيئة أثناء القراءة"}
      title={enabled ? "الشاشة مضيئة — اضغط للإيقاف" : "إبقاء الشاشة مضيئة أثناء القراءة"}
      className={`${btnSecondary} h-11 px-4 ${enabled ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""} ${className}`}
    >
      {enabled ? (
        <Sun className="h-5 w-5 text-emerald-700" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
      <span>{enabled ? "الشاشة مضيئة" : "إبقاء الشاشة"}</span>
    </button>
  );
}

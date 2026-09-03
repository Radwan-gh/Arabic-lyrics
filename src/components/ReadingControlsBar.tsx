import { LyricsFontControls } from "@/components/LyricsFontControls";
import { KeepScreenAwake } from "@/components/KeepScreenAwake";

// ─────────────────────────────────────────────────────────────────────────────
// بار أدوات القراءة المشترك: إبقاء الشاشة مضيئة + حجم خط النشيد. يُستخدم في صفحتَي
// عرض الوصلة (المتصلة) وفي مرآة القراءة دون اتصال، فتبقى التجربة موحّدة أونلاين وأوفلاين.
// ─────────────────────────────────────────────────────────────────────────────
export function ReadingControlsBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm ${className}`}
    >
      <KeepScreenAwake />
      <LyricsFontControls />
    </div>
  );
}

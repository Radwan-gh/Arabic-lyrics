"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { btnSecondary } from "@/lib/ui";
import { isWakeLockSupported, persistWakeLockPref, readStoredWakeLockPref } from "@/lib/wake-lock";

// ─────────────────────────────────────────────────────────────────────────────
// زرّ «إبقاء الشاشة مضيئة» لصفحة الأنشودة: يمنع الموبايل من إطفاء الشاشة أثناء القراءة
// عبر واجهة Screen Wake Lock. يبدأ مطفأً في كل زيارة، لكن يُحفظ آخر اختيار في localStorage
// ويُعاد تطبيقه تلقائيًا في الأناشيد التالية. يختفي كليًا على المتصفحات غير المدعومة.
// المتصفّحات تُحرّر القفل تلقائيًا عند إخفاء التبويب، لذا نُعيد طلبه عند عودة الصفحة للواجهة.
// ─────────────────────────────────────────────────────────────────────────────

export function KeepScreenAwake({ className = "" }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  // تفضيل المستخدم المقصود — مرجعًا حتى يقرأه مستمع تغيّر الظهور دون إعادة اشتراك.
  const wantOnRef = useRef(false);

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // القفل ربّما حُرِّر مسبقًا من النظام — لا شيء لفعله.
      }
    }
    setEnabled(false);
  }, []);

  const acquire = useCallback(async () => {
    // لا يُطلب القفل إلا والصفحة ظاهرة (شرط الواجهة في المتصفّحات).
    if (sentinelRef.current || document.visibilityState !== "visible") return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setEnabled(true);
      // يُطلقه النظام عند إطفاء الشاشة/إخفاء التبويب؛ نُحدّث الحالة تبعًا لذلك.
      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) sentinelRef.current = null;
        setEnabled(false);
      });
    } catch {
      // قد يُرفض الطلب (يتطلّب تفاعلًا، أو الصفحة مخفية) — نُبقيه مطفأً بصدق.
      setEnabled(false);
    }
  }, []);

  // كشف الدعم + تطبيق التفضيل المحفوظ بعد التركيب، وإعادة الطلب عند عودة الصفحة للواجهة.
  useEffect(() => {
    if (!isWakeLockSupported()) return;
    setSupported(true);

    if (readStoredWakeLockPref()) {
      wantOnRef.current = true;
      void acquire();
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && wantOnRef.current) void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [acquire, release]);

  if (!supported) return null;

  const toggle = () => {
    const next = !enabled;
    wantOnRef.current = next;
    persistWakeLockPref(next);
    if (next) void acquire();
    else void release();
  };

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

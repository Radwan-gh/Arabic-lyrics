"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { focusRing } from "@/lib/ui";

/**
 * زر عائم يظهر بعد تمرير الصفحة مسافة معقولة، ويعيد المستخدم إلى الأعلى بسلاسة.
 * ضروري مع التمرير اللانهائي الذي يُطيل الصفحة بلا حدّ ثابت (لا ترقيم صفحات
 * يعيده إلى القمة تلقائياً).
 */
export function BackToTopButton({ className = "" }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="العودة إلى الأعلى"
      title="العودة إلى الأعلى"
      className={`inline-flex items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg hover:bg-emerald-800 ${focusRing} ${className}`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

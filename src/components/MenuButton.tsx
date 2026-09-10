"use client";

import { Menu } from "lucide-react";
import { useMenu } from "@/lib/menu-context";
import { focusRing } from "@/lib/ui";

/**
 * زرّ فتح درج القائمة الجانبي — يُستخدم في ترويسة كل شاشة غامرة على الموبايل،
 * إذ يُخفي AppChrome شريط Navbar (وزرّه الأصلي) في تلك المسارات (راجع
 * lib/menu-context.tsx). بلا هذا الزرّ لا سبيل للوصول إلى المفضلة/الوصلات/تسجيل
 * الخروج إلخ من داخل تلك الشاشات سوى بالرجوع خطوة بخطوة.
 */
export function MenuButton({ className }: { className?: string }) {
  const { setOpen } = useMenu();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="فتح القائمة"
      className={
        className ??
        `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#3c4a44] transition-colors hover:bg-black/5 ${focusRing}`
      }
    >
      <Menu className="h-[22px] w-[22px]" aria-hidden="true" />
    </button>
  );
}

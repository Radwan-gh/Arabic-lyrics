"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { focusRing } from "@/lib/ui";

/**
 * الجزء الظاهر من الشاشة فوق لوحة المفاتيح الافتراضية: ارتفاعه، والمسافة التي
 * تغطيها اللوحة من أسفل الشاشة (0 حين تكون مغلقة).
 */
function useVisibleViewport() {
  const [vp, setVp] = useState<{ height: number; inset: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setVp({ height: vv.height, inset: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return vp;
}

const stop = (e: TouchEvent) => e.stopPropagation();

interface TagSheetProps {
  title: string;
  onClose: () => void;
  dark?: boolean;
  /** محتوى اللوح (منتقي الوسوم) — يملأ الارتفاع المتبقي ويمرّر قائمته داخليًا. */
  children: ReactNode;
}

/**
 * لوح سفلي لمنتقي الوسوم على الموبايل:
 * - ارتفاع ثابت لا يتغيّر مع عدد النتائج؛ القائمة وحدها تُمرَّر داخله.
 * - لا تُفتح لوحة المفاتيح تلقائيًا (التركيز على اللوح لا على حقل البحث).
 * - إن فُتحت لوحة المفاتيح يرتفع اللوح فوقها ويتقلّص بقدر الجزء الظاهر فقط.
 * - تثبيت الصفحة خلفه، وEsc للإغلاق، ولا يصل السحب داخله إلى شاشة القراءة.
 */
export function TagSheet({ title, onClose, dark = false, children }: TagSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const vp = useVisibleViewport();

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const keyboardOpen = !!vp && vp.inset > 0;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onTouchStart={stop}
      onTouchEnd={stop}
    >
      <button
        type="button"
        aria-label="إغلاق"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 ${dark ? "bg-black/50" : "bg-[#14211c]/30"}`}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        style={keyboardOpen ? { bottom: vp.inset, maxHeight: vp.height - 12 } : undefined}
        className={`absolute inset-x-0 bottom-0 flex h-[min(36rem,80dvh)] flex-col gap-3 rounded-t-3xl px-5 pt-2.5 shadow-2xl outline-none ${
          keyboardOpen ? "pb-3" : "pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        } ${dark ? "bg-[#17221e]" : "bg-white"}`}
      >
        <span
          aria-hidden="true"
          className={`mx-auto h-1.5 w-11 shrink-0 rounded-full ${dark ? "bg-white/20" : "bg-neutral-200"}`}
        />
        <div className="flex shrink-0 items-center justify-between gap-3">
          <span className={`truncate text-lg font-extrabold ${dark ? "text-[#f2f5f3]" : "text-[#14211c]"}`}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold ${
              dark ? "text-emerald-300 focus-visible:ring-offset-[#17221e]" : "text-emerald-700"
            } ${focusRing}`}
          >
            تم
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

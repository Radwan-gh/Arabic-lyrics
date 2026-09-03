"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * شريط تقدّم رفيع أعلى الصفحة يظهر عند بدء الانتقال إلى صفحة جديدة ويكتمل عند
 * وصولها — إشارة حديثة وبسيطة تُطمئن المستخدم أنّ نقرته سُجّلت والصفحة قيد التحميل.
 *
 * يُركَّب مرّة واحدة في التخطيط الجذر. يرصد بدء الانتقال من ثلاثة مصادر:
 * النقر على رابط داخلي، واستدعاءات `history.pushState/replaceState` (مثل
 * `router.push`)، وأزرار الرجوع/التقدّم (`popstate`). ويكتمل عند تغيّر المسار.
 *
 * مقصور على تغيّر المسار (pathname) دون تغيّر معطيات الاستعلام وحدها، حتى لا
 * يومض الشريط مع كل ضغطة أثناء البحث الحيّ الذي يحدّث `?q=` فقط.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const activeRef = useRef(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failSafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    lastPathRef.current = window.location.pathname;

    function clearTrickle() {
      if (trickleRef.current) {
        clearInterval(trickleRef.current);
        trickleRef.current = null;
      }
    }

    function start() {
      if (activeRef.current) return;
      activeRef.current = true;
      if (hideRef.current) clearTimeout(hideRef.current);
      setVisible(true);
      setProgress(8);
      // يتقدّم الشريط تدريجياً نحو 90% ثم يتوقّف بانتظار اكتمال التحميل الفعلي.
      trickleRef.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : Math.min(90, p + Math.max(0.5, (90 - p) * 0.08))));
      }, 200);
      // صمّام أمان: لو تعذّر رصد الاكتمال لأيّ سبب، أنهِ الشريط تلقائياً.
      if (failSafeRef.current) clearTimeout(failSafeRef.current);
      failSafeRef.current = setTimeout(done, 10000);
    }

    function done() {
      if (!activeRef.current) return;
      activeRef.current = false;
      clearTrickle();
      if (failSafeRef.current) clearTimeout(failSafeRef.current);
      setProgress(100);
      hideRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    // يبدأ الانتقال فقط حين يختلف مسار الوجهة عن المسار الحالي.
    function startIfPathChanges(nextUrl: string | URL | null | undefined) {
      if (nextUrl == null) return;
      try {
        const next = new URL(String(nextUrl), window.location.href);
        if (next.origin === window.location.origin && next.pathname !== window.location.pathname) {
          start();
        }
      } catch {
        // تجاهل عناوين غير صالحة.
      }
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      startIfPathChanges(href);
    }

    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (this: History, ...args: Parameters<History["pushState"]>) {
      startIfPathChanges(args[2] as string | URL | null | undefined);
      return origPush.apply(this, args);
    };
    history.replaceState = function (this: History, ...args: Parameters<History["replaceState"]>) {
      startIfPathChanges(args[2] as string | URL | null | undefined);
      return origReplace.apply(this, args);
    };

    function onPopState() {
      if (window.location.pathname !== lastPathRef.current) start();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
      window.removeEventListener("popstate", onPopState);
      history.pushState = origPush;
      history.replaceState = origReplace;
      clearTrickle();
      if (hideRef.current) clearTimeout(hideRef.current);
      if (failSafeRef.current) clearTimeout(failSafeRef.current);
    };
  }, []);

  // اكتمال الانتقال: تغيّر المسار يعني وصول الصفحة الجديدة.
  useEffect(() => {
    lastPathRef.current = pathname;
    if (!activeRef.current) return;
    activeRef.current = false;
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (failSafeRef.current) clearTimeout(failSafeRef.current);
    setProgress(100);
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden="true">
      <div
        className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}

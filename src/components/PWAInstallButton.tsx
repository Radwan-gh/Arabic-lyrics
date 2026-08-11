"use client";

import { useEffect, useState } from "react";
import { focusRing } from "@/lib/ui";

/**
 * زرّ «تثبيت التطبيق» المخصص.
 *
 * يعتمد على حدث `beforeinstallprompt` الذي تطلقه المتصفحات الداعمة (Chrome على
 * أندرويد وسطح المكتب) عندما يكون التطبيق قابلًا للتثبيت. نمنع النافذة الافتراضية
 * ونخزّن الحدث لنعرض زرًّا خاصًا داخل الواجهة بدلًا منها. لا يظهر الزر إذا كان
 * التطبيق مثبّتًا بالفعل (وضع standalone) أو إذا كان المتصفح لا يدعم التثبيت
 * (مثل Safari على iOS).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // لا تعرض الزر إذا كان التطبيق مفتوحًا أصلًا كتطبيق مثبّت.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari على iOS يستخدم خاصية غير قياسية.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      // بعد اختيار المستخدم لا يمكن إعادة استخدام الحدث؛ أخفِ الزر.
      setDeferred(null);
      setInstalling(false);
    }
  }

  if (!deferred) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={installing}
      className={`inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      تثبيت التطبيق
    </button>
  );
}

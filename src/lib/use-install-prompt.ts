"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// منطق «تثبيت التطبيق» المشترك (حدث beforeinstallprompt)، مستخرَج من
// PWAInstallButton ليُعاد استخدامه بمظهر مختلف (زرّ كامل العرض في شاشة دون اتصال
// على الموبايل). راجع التعليق الأصلي في PWAInstallButton.tsx لتفاصيل السلوك.
// ─────────────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
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

  async function install() {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      setInstalling(false);
    }
  }

  return { installable: !!deferred, installing, install };
}

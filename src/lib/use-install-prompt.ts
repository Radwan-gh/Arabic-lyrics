"use client";

import { useState, useSyncExternalStore } from "react";
import { INSTALL_PROMPT_KEY as CAPTURE_KEY } from "@/lib/install-prompt-script";

// ─────────────────────────────────────────────────────────────────────────────
// منطق «تثبيت التطبيق» المشترك (حدث beforeinstallprompt) بين زرّ شريط التنقّل
// (PWAInstallButton) وعنصر «تثبيت التطبيق» في درج القائمة على الموبايل.
//
// يُطلق المتصفح الحدث مرة واحدة لكل تحميل صفحة، وكثيرًا ما يسبق اكتمال الـ hydration
// (خاصة حين تُخدَم الصفحة من هيكل الـ SW). لذا يلتقطه سكربت مضمَّن في <head>
// (راجع install-prompt-script.ts) ويحفظه في window، ويُحفظ هنا في مخزن واحد على
// مستوى الوحدة — فيراه أي مكوّن يُركَّب لاحقًا (مثل الدرج عند فتحه) لا من ركّب أولًا فقط.
// ─────────────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallWindow = Window & { __installPrompt?: BeforeInstallPromptEvent | null };

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let attached = false;

function setDeferred(event: BeforeInstallPromptEvent | null) {
  deferred = event;
  (window as InstallWindow)[CAPTURE_KEY] = event;
  listeners.forEach((listener) => listener());
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function attach() {
  if (attached) return;
  attached = true;
  if (isStandalone()) return;

  deferred = (window as InstallWindow)[CAPTURE_KEY] ?? null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    setDeferred(event as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => setDeferred(null));
}

function subscribe(listener: () => void) {
  attach();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => deferred;
const getServerSnapshot = () => null;

export function useInstallPrompt() {
  const event = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [installing, setInstalling] = useState(false);

  async function install() {
    if (!event) return;
    setInstalling(true);
    try {
      await event.prompt();
      await event.userChoice;
    } finally {
      // الحدث صالح لاستدعاء prompt() مرة واحدة فقط.
      setDeferred(null);
      setInstalling(false);
    }
  }

  return { installable: !!event, installing, install };
}

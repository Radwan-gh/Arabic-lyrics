// ─────────────────────────────────────────────────────────────────────────────
// مظهر الموقع (فاتح/داكن) — مصدر واحد للحقيقة يتشاركه زرّ القائمة وسكربت منع الوميض.
//
// المظهر صنف `dark` على <html>؛ ألوان Tailwind مربوطة بمتغيّرات CSS تنقلب به
// (راجع globals.css). اختيار المستخدم يُحفظ في localStorage؛ وما لم يختر يتبع
// إعداد نظام الجهاز ويتغيّر معه حيًّا.
// ─────────────────────────────────────────────────────────────────────────────

export type SiteTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "arabic-lyrics:theme";
const THEME_EVENT = "site-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * يُنفَّذ في <head> قبل الرسم: يطبّق المظهر المحفوظ (أو مظهر النظام) فورًا حتى لا
 * تومض الصفحة فاتحةً ثم تنقلب. مكتوب بـ ES5 ومغلّف بـ try لأنه يعمل قبل أي شيء.
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t==="dark"||(t!=="light"&&window.matchMedia&&window.matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

function readStoredTheme(): SiteTheme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "dark" || raw === "light" ? raw : null;
  } catch {
    return null;
  }
}

function systemTheme(): SiteTheme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme: SiteTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** المظهر المطبَّق حاليًا على الصفحة. آمن على الخادم (يُرجع «فاتح»). */
export function getSiteTheme(): SiteTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** يطبّق المظهر ويحفظه كاختيار صريح للمستخدم. */
export function setSiteTheme(theme: SiteTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // التخزين معطّل (تصفّح خاص) — يبقى المظهر للجلسة الحالية فقط.
  }
  applyTheme(theme);
}

/** اشتراك بتغيّرات المظهر (لـ useSyncExternalStore في use-site-theme.ts). */
export function subscribeSiteTheme(onChange: () => void): () => void {
  const media = window.matchMedia?.(DARK_QUERY);
  // بلا اختيار صريح: اتبع تغيّر مظهر النظام حيًّا.
  const onSystem = () => {
    if (readStoredTheme() === null) applyTheme(systemTheme());
  };
  // تغيّر الاختيار من تبويب آخر.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) applyTheme(readStoredTheme() ?? systemTheme());
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media?.addEventListener?.("change", onSystem);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media?.removeEventListener?.("change", onSystem);
  };
}

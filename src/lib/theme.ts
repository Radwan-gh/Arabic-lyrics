// ─────────────────────────────────────────────────────────────────────────────
// مظهر العرض (فاتح / داكن / ورقي) — إعداد واحد للموقع كله، بما فيه شاشة القراءة.
//
// المظهر صنف على <html> (`dark` أو `paper`؛ الفاتح بلا صنف)، وألوان Tailwind مربوطة
// بمتغيّرات CSS تتبدّل به (راجع globals.css). الاختيار يُحفظ في مكانين:
//   - كوكي: يقرؤه الخادم فيرسل الصفحة بالمظهر الصحيح من أول بايت (لا وميض).
//   - localStorage: يقرؤه سكربت <head> قبل الرسم، لصفحات مخزَّنة دون اتصال قد تحمل
//     مظهرًا قديمًا، ويُعيد كتابة الكوكي إن غاب.
// ما لم يختر المستخدم يتبع الموقع إعداد الجهاز (فاتح/داكن) ويتغيّر معه حيًّا.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE_THEMES = ["light", "dark", "paper"] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];

export const SITE_THEME_LABELS: Record<SiteTheme, string> = {
  light: "فاتح",
  dark: "داكن",
  paper: "ورقي",
};

export const THEME_STORAGE_KEY = "arabic-lyrics:theme";
export const THEME_COOKIE = "site-theme";
const THEME_EVENT = "site-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

export function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === "string" && (SITE_THEMES as readonly string[]).includes(value);
}

/** صنف <html> لكل مظهر (للخادم وللعميل). */
export function themeClass(theme: SiteTheme | null | undefined): string {
  return theme === "dark" ? "dark" : theme === "paper" ? "paper" : "";
}

/**
 * يُنفَّذ في <head> قبل الرسم: يطبّق المظهر المحفوظ (أو مظهر الجهاز) فورًا، ويُعيد
 * كتابة الكوكي إن غاب حتى يرسل الخادم المظهر الصحيح في الطلب التالي. مكتوب بـ ES5
 * ومغلّف بـ try لأنه يعمل قبل أي شيء.
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},c=${JSON.stringify(
  THEME_COOKIE,
)},t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"&&t!=="paper"){t=null;}else if(document.cookie.indexOf(c+"="+t)<0){document.cookie=c+"="+t+"; path=/; max-age=${ONE_YEAR_S}; samesite=lax";}var m=t||(window.matchMedia&&window.matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches?"dark":"light");var e=document.documentElement.classList;e.remove("dark","paper");if(m!=="light")e.add(m);}catch(x){}})();`;

function readStoredTheme(): SiteTheme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isSiteTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

function systemTheme(): SiteTheme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme: SiteTheme): void {
  const list = document.documentElement.classList;
  list.remove("dark", "paper");
  const cls = themeClass(theme);
  if (cls) list.add(cls);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** المظهر المطبَّق حاليًا على الصفحة. آمن على الخادم (يُرجع «فاتح»). */
export function getSiteTheme(): SiteTheme {
  if (typeof document === "undefined") return "light";
  const list = document.documentElement.classList;
  return list.contains("dark") ? "dark" : list.contains("paper") ? "paper" : "light";
}

/** يطبّق المظهر ويحفظه (localStorage + كوكي) كاختيار صريح للمستخدم. */
export function setSiteTheme(theme: SiteTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // التخزين معطّل (تصفّح خاص) — يبقى الكوكي وحده.
  }
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR_S}; samesite=lax`;
  applyTheme(theme);
}

/** اشتراك بتغيّرات المظهر (لـ useSyncExternalStore في use-site-theme.ts). */
export function subscribeSiteTheme(onChange: () => void): () => void {
  const media = window.matchMedia?.(DARK_QUERY);
  // بلا اختيار صريح: اتبع تغيّر مظهر الجهاز حيًّا.
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

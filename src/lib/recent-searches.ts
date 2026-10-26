// ─────────────────────────────────────────────────────────────────────────────
// آخر عمليات البحث — قائمة قصيرة بآخر الكلمات التي بحث عنها المستخدم على هذا
// الجهاز، تُعرض عند التركيز على حقل البحث وهو فارغ لإعادة البحث بنقرة واحدة.
//
// تُحفظ في localStorage (لا على الخادم): تعمل دون تسجيل دخول ودون اتصال، وتبقى
// خاصّة بالجهاز. يتشاركها حقل الموبايل (HomeScreen) وحقل سطح المكتب (SearchBar)
// المُحمَّلان معًا، فيُطلق كل تعديل حدثًا على `window` ليتزامن الاثنان فورًا،
// ويُلتقط حدث `storage` لمزامنة التبويبات الأخرى.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";
import { normalizeArabic } from "@/lib/arabic-search";

/** مفتاح التخزين في localStorage. */
export const RECENT_SEARCHES_STORAGE_KEY = "recent-searches";

/** أقصى عدد من الكلمات المحفوظة (الأحدث أولًا). */
export const RECENT_SEARCHES_MAX = 8;

/** أقصر كلمة تُحفظ — لتجنّب حفظ حرف واحد كُتب ثم تُرك. */
export const RECENT_SEARCHES_MIN_LENGTH = 2;

/** حدث على `window` يُطلَق بعد كل تعديل للقائمة في هذا التبويب. */
const RECENT_SEARCHES_EVENT = "recent-searches-change";

const EMPTY: string[] = [];

// لقطة مُخزَّنة مؤقتًا: useSyncExternalStore يتطلّب إرجاع المرجع نفسه ما لم
// تتغيّر البيانات، وإلا أعاد الرسم بلا نهاية.
let cachedRaw: string | null = null;
let cachedList: string[] = EMPTY;

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    return value.filter((v): v is string => typeof v === "string").slice(0, RECENT_SEARCHES_MAX);
  } catch {
    return EMPTY;
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === RECENT_SEARCHES_STORAGE_KEY) onChange();
  };
  window.addEventListener(RECENT_SEARCHES_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(RECENT_SEARCHES_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(list: string[]): void {
  try {
    if (list.length) localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(list));
    else localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    // قد يكون التخزين معطّلًا (تصفّح خاص) — الميزة تتوقّف بصمت دون كسر البحث.
  }
  window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
}

/** مفتاح المقارنة: كلمتان تختلفان في التشكيل أو صورة الحرف فقط تُعدّان واحدة. */
function keyOf(term: string): string {
  return normalizeArabic(term);
}

/** يضيف كلمة إلى رأس القائمة (ويزيل نسختها السابقة إن وُجدت). */
export function addRecentSearch(term: string): void {
  const trimmed = term.trim().replace(/\s+/g, " ");
  if (trimmed.length < RECENT_SEARCHES_MIN_LENGTH) return;
  const key = keyOf(trimmed);
  if (!key) return;
  const current = getSnapshot();
  if (current[0] === trimmed) return;
  const next = [trimmed, ...current.filter((t) => keyOf(t) !== key)].slice(0, RECENT_SEARCHES_MAX);
  write(next);
}

/** يحذف كلمة واحدة من القائمة. */
export function removeRecentSearch(term: string): void {
  const current = getSnapshot();
  const next = current.filter((t) => t !== term);
  if (next.length !== current.length) write(next);
}

/** يمسح القائمة كاملة. */
export function clearRecentSearches(): void {
  if (getSnapshot().length) write(EMPTY);
}

/** القائمة الحالية (الأحدث أولًا) متزامنة بين كل الحقول والتبويبات. */
export function useRecentSearches() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { items, add: addRecentSearch, remove: removeRecentSearch, clear: clearRecentSearches };
}

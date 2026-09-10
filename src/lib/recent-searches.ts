"use client";

// عمليات البحث الأخيرة في شاشة البحث الكاملة — الأحدث أولًا، بلا تكرار (بعد
// التطبيع العربي)، وسقف صغير. محليّة بالكامل (localStorage) — لا صلة بها على الخادم.

const KEY = "arabic-lyrics:recent-searches";
const MAX = 6;

import { normalizeArabic } from "./arabic-search";

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const clean = query.trim();
  if (!clean) return;
  try {
    const existing = readRecentSearches();
    const nq = normalizeArabic(clean);
    const deduped = existing.filter((s) => normalizeArabic(s) !== nq);
    localStorage.setItem(KEY, JSON.stringify([clean, ...deduped].slice(0, MAX)));
  } catch {
    // التخزين قد يكون معطّلًا (تصفّح خاص) — نتجاهل بصمت.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// تفضيلات قارئ الأنشودة (الشاشة الغامرة على الموبايل): تباعد الأسطر.
// (مظهر العرض فاتح/داكن/ورقي إعداد واحد للموقع كله — راجع lib/theme.ts.)
// على غرار lyrics-font.ts و wake-lock.ts — تخزين محلي مغلّف بـ try/catch، ويبقى
// الاختيار ثابتًا عبر الأناشيد والجلسات. نطاق التأثير محصور بشاشة القراءة الغامرة
// ووضع الأداء (لا يُطبَّق كمتغيّر CSS عالمي كحجم الخط، فتأثيره أخفّ ولا يمسّ بقية الموقع).
// ─────────────────────────────────────────────────────────────────────────────

export const LINE_SPACING_LEVELS = ["compact", "comfortable", "wide"] as const;
export type LineSpacing = (typeof LINE_SPACING_LEVELS)[number];
export const LINE_SPACING_DEFAULT: LineSpacing = "comfortable";
export const LINE_SPACING_LABELS: Record<LineSpacing, string> = {
  compact: "متقارب",
  comfortable: "مريح",
  wide: "متباعد",
};
export const LINE_SPACING_CLS: Record<LineSpacing, string> = {
  compact: "leading-relaxed",
  comfortable: "leading-loose",
  wide: "leading-[2.5]",
};
/** النسخة نفسها بـ`!` لتغلب leading-loose المضمّنة في نمط نص الأنشودة (lyricsProseCls). */
export const LINE_SPACING_IMPORTANT_CLS: Record<LineSpacing, string> = {
  compact: "!leading-relaxed",
  comfortable: "!leading-loose",
  wide: "!leading-[2.5]",
};

const LINE_SPACING_KEY = "arabic-lyrics:line-spacing";

function readEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistEnum(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // قد يكون التخزين معطّلًا (تصفّح خاص) — نُبقي التغيير للجلسة الحالية فقط.
  }
}

export function readStoredLineSpacing(): LineSpacing {
  return readEnum(LINE_SPACING_KEY, LINE_SPACING_LEVELS, LINE_SPACING_DEFAULT);
}
export function persistLineSpacing(value: LineSpacing): void {
  persistEnum(LINE_SPACING_KEY, value);
}

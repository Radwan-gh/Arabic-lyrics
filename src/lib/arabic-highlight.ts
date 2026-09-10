import { normalizeArabic, stripHtml, isArabicDiacritic } from "./arabic-search";

// ─────────────────────────────────────────────────────────────────────────────
// إيجاد موضع مطابقة البحث داخل النص الأصلي (للتظليل) رغم أنّ normalizeArabic
// يحذف أحرفًا (التشكيل) ويُبدّل أخرى — فموضع المطابقة في النص المُطبَّع لا يقابل
// نفس الموضع في النص الأصلي مباشرة. هذه نسخة تعمل حرفًا-بحرف من نفس قواعد
// normalizeArabic (مبنيّة على نقاط Unicode مباشرة، لا نسخ حرفي لنطاقات قد
// يُخطئ في تمييز رموزها المركّبة)، وتُبقي خريطة "أيّ حرف أصلي أنتج كل حرف
// مُطبَّع" لإرجاع موضع المطابقة بإحداثيات النص الأصلي.
// ─────────────────────────────────────────────────────────────────────────────

const ALEF_VARIANT_CODES = new Set([0x0623, 0x0625, 0x0622, 0x0671, 0x0672, 0x0673]); // أ إ آ ٱ ٲ ٳ
const WAW_HAMZA = 0x0624; // ؤ
const YEH_HAMZA = 0x0626; // ئ
const HAMZA = 0x0621; // ء
const TEH_MARBUTA = 0x0629; // ة
const ALEF_MAQSURA = 0x0649; // ى
const ARABIC_INDIC_ZERO = 0x0660; // ٠
const ARABIC_INDIC_NINE = 0x0669; // ٩
const EXT_ARABIC_INDIC_ZERO = 0x06f0; // ۰
const EXT_ARABIC_INDIC_NINE = 0x06f9; // ۹

/** هل هذا الحرف مسموح في نتيجة normalizeArabic النهائية؟ يقابل `[ء-ي0-9a-z]`. */
function isKeptChar(c: string): boolean {
  const code = c.codePointAt(0) ?? 0;
  return (code >= 0x0621 && code <= 0x064a) || (code >= 0x30 && code <= 0x39) || (code >= 0x61 && code <= 0x7a);
}

/** يطبّق نفس قاعدة تحويل حرف واحد التي يستخدمها normalizeArabic. null = يُحذف الحرف بلا أثر. */
function mapChar(c: string): string | null {
  const code = c.codePointAt(0) ?? 0;
  if (isArabicDiacritic(code)) return null;
  if (ALEF_VARIANT_CODES.has(code)) return "ا";
  if (code === WAW_HAMZA) return "و";
  if (code === YEH_HAMZA) return "ي";
  if (code === HAMZA) return null;
  if (code === TEH_MARBUTA) return "ه";
  if (code === ALEF_MAQSURA) return "ي";
  if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_NINE) return String(code - ARABIC_INDIC_ZERO);
  if (code >= EXT_ARABIC_INDIC_ZERO && code <= EXT_ARABIC_INDIC_NINE) return String(code - EXT_ARABIC_INDIC_ZERO);
  return c.toLowerCase();
}

/** يطبّع نصًا مع خريطة `map[i]` = فهرس الحرف الأصلي (في النص بعد NFC) الذي أنتج `normalized[i]`. */
function normalizeWithMap(input: string): { normalized: string; map: number[] } {
  const source = input.normalize("NFC");
  let normalized = "";
  const map: number[] = [];

  for (let i = 0; i < source.length; i++) {
    const mapped = mapChar(source[i]);
    if (mapped === null) continue;
    if (isKeptChar(mapped)) {
      normalized += mapped;
      map.push(i);
    } else if (normalized.length === 0 || normalized[normalized.length - 1] !== " ") {
      normalized += " ";
      map.push(i);
    }
  }

  // trim، مطابقةً لـ .trim() في normalizeArabic — نزيل المسافات الطرفية من الخريطة أيضًا.
  let start = 0;
  let end = normalized.length;
  while (start < end && normalized[start] === " ") start++;
  while (end > start && normalized[end - 1] === " ") end--;

  return { normalized: normalized.slice(start, end), map: map.slice(start, end) };
}

export interface MatchSpan {
  /** فهرس بداية المطابقة في النص المصدر (بعد NFC) — نهاية غير شاملة (exclusive). */
  start: number;
  end: number;
}

/** يبحث عن أول مطابقة لـ `query` (مُطبَّعة) داخل `text`، بإحداثيات `text` الأصلية
 * (بعد NFC — يتطابق عمليًا مع النص كما هو للنصوص العربية المُركَّبة مسبقًا).
 * يُرجع null إن لم توجد مطابقة أو كانت `query` فارغة بعد التطبيع. */
export function findArabicMatch(text: string, query: string): MatchSpan | null {
  const nq = normalizeArabic(query);
  if (!nq || !text) return null;

  const { normalized, map } = normalizeWithMap(text);
  const idx = normalized.indexOf(nq);
  if (idx === -1) return null;

  return { start: map[idx], end: map[idx + nq.length - 1] + 1 };
}

export interface HighlightedText {
  before: string;
  match: string;
  after: string;
}

/** يقسم نص (بعد NFC) إلى ما قبل/داخل/بعد المطابقة، جاهزًا للعرض (تظليل `match`). */
export function splitAtMatch(text: string, span: MatchSpan): HighlightedText {
  const source = text.normalize("NFC");
  return { before: source.slice(0, span.start), match: source.slice(span.start, span.end), after: source.slice(span.end) };
}

const SNIPPET_CONTEXT = 28;

/** يبني مقتطفًا من نص الكلمات (HTML) حول أول مطابقة، مع علامات حذف على الطرفين
 * عند القصّ. يُرجع null إن لم توجد مطابقة داخل الكلمات. */
export function buildContentSnippet(
  contentHtml: string,
  query: string,
): (HighlightedText & { truncatedStart: boolean; truncatedEnd: boolean }) | null {
  const plain = stripHtml(contentHtml);
  const span = findArabicMatch(plain, query);
  if (!span) return null;

  const start = Math.max(0, span.start - SNIPPET_CONTEXT);
  const end = Math.min(plain.length, span.end + SNIPPET_CONTEXT);

  return {
    before: plain.slice(start, span.start),
    match: plain.slice(span.start, span.end),
    after: plain.slice(span.end, end),
    truncatedStart: start > 0,
    truncatedEnd: end < plain.length,
  };
}

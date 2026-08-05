// أدوات تطبيع النص العربي للبحث.
// الفكرة: نُمرّر النص المخزَّن وكلمة البحث عبر نفس الدالة `normalizeArabic`
// حتى يتطابقا بغضّ النظر عن التشكيل أو صورة الحرف (أ/إ/آ، ة/ه، ى/ي ...).
// الملف نقيّ بلا اعتماديات ليعمل داخل Next.js وداخل سكربتات prisma عبر tsx.

// علامات التشكيل والعلامات المركّبة العربية + التطويل (شدّة/مدّة/تنوين/سكون ...).
// النطاقات (بالـ Unicode):
//   0610–061A علامات وملحقات، 064B–065F الحركات والتنوين والملحقات،
//   0670 الألف الخنجرية، 06D6–06DC و 06DF–06E4 و 06E7–06E8 و 06EA–06ED علامات التجويد،
//   0640 التطويل.
const DIACRITICS_RE =
  /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭـ]/g;

// كيانات HTML الشائعة التي قد ترد في نص Quill المخزَّن.
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/**
 * يحوّل نص الكلمات المخزَّن كـ HTML إلى نص خام.
 * يحوّل حدود الفقرات/الأسطر إلى مسافات حتى لا تلتصق الكلمات، ثم يزيل بقية الوسوم.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * يطبّع النص العربي لأغراض البحث:
 * - إزالة التشكيل والتطويل.
 * - توحيد صور الألف والهمزات والتاء المربوطة والألف المقصورة.
 * - تحويل الأرقام العربية-الهندية إلى لاتينية.
 * - إزالة علامات الترقيم، وتصغير الأحرف اللاتينية، وتقليص المسافات.
 */
export function normalizeArabic(input: string): string {
  if (!input) return "";

  let text = input.normalize("NFC");

  // إزالة التشكيل والتطويل.
  text = text.replace(DIACRITICS_RE, "");

  // توحيد صور الألف (أ إ آ ٱ ٲ ٳ) → ا.
  text = text.replace(/[أإآٱٲٳ]/g, "ا");

  // توحيد الهمزات: واو الهمزة → و، ياء الهمزة → ي، والهمزة المفردة تُحذف.
  text = text
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/ء/g, ""); // ء

  // التاء المربوطة → هاء.
  text = text.replace(/ة/g, "ه"); // ة → ه

  // الألف المقصورة → ياء.
  text = text.replace(/ى/g, "ي"); // ى → ي

  // الأرقام العربية-الهندية (٠-٩ و ۰-۹) → لاتينية.
  text = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

  // تصغير الأحرف اللاتينية (لا أثر له على العربية).
  text = text.toLowerCase();

  // استبدال أي محرف ليس حرفًا عربيًا (0621–064A) أو رقمًا/حرفًا لاتينيًا بمسافة.
  text = text.replace(/[^ء-ي0-9a-z]+/g, " ");

  // تقليص المسافات.
  return text.replace(/\s+/g, " ").trim();
}

/**
 * يبني النص القابل للبحث من حقول النشيد (يُخزَّن في العمود الظلّي `searchText`).
 * يمرّر نص الكلمات عبر `stripHtml` أولًا ثم يطبّع المجموع الكامل.
 */
export function buildSearchText(rec: {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  content?: string | null;
}): string {
  const parts = [
    rec.title ?? "",
    rec.artist ?? "",
    rec.album ?? "",
    stripHtml(rec.content ?? ""),
  ];
  return normalizeArabic(parts.join(" "));
}

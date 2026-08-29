// ─────────────────────────────────────────────────────────────────────────────
// تقسيم نصّ الأنشودة إلى «شرائح» لتصدير الصور: عند طول النصّ نُخرِج عدّة صور بدل
// صورة واحدة طويلة يصعب قراءتها. المحتوى سلسلة مسطّحة من عناصر <p> (سطر لكل فقرة،
// و<p><br></p> فارغة تفصل المقاطع)، فالتقسيم عند حدود الفقرات/المقاطع مباشر.
//
// دوال هذا الملف تعمل في المتصفّح فقط (تستخدم DOMParser)، وتُستدعى عند التصدير.
// ─────────────────────────────────────────────────────────────────────────────

/** يُفكّك HTML الأنشودة المُعقّم إلى قائمة فقرات (outerHTML لكلّ <p>). */
export function extractParagraphs(contentHtml: string): string[] {
  const doc = new DOMParser().parseFromString(contentHtml, "text/html");
  const paras = Array.from(doc.body.querySelectorAll("p")).map((p) => p.outerHTML);
  // احتياط: إن لم يكن المحتوى فقرات (حالة نادرة) نُعيده شريحةً واحدة.
  return paras.length > 0 ? paras : [contentHtml];
}

/** فقرة فارغة (فاصل مقطع): لا نصّ فيها سوى <br> أو فراغ. */
export function isBlankParagraph(paragraphHtml: string): boolean {
  const doc = new DOMParser().parseFromString(paragraphHtml, "text/html");
  return (doc.body.textContent ?? "").trim().length === 0;
}

/** يُزيل الفقرات الفارغة من طرفَي الشريحة حتى لا تبدأ/تنتهي بفراغ. */
export function trimBlankEdges(paragraphs: string[]): string[] {
  let start = 0;
  let end = paragraphs.length;
  while (start < end && isBlankParagraph(paragraphs[start])) start++;
  while (end > start && isBlankParagraph(paragraphs[end - 1])) end--;
  return paragraphs.slice(start, end);
}

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** يحوّل رقمًا إنجليزيًّا إلى أرقام عربية-هندية للعرض على الصورة. */
export function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)]);
}

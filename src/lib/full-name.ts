/**
 * الاسم الكامل المطلوب عند إنشاء حساب عبر Google: كلمتان على الأقل (الاسم
 * والكنية)، كل منهما حرفان فأكثر، بأحرف (عربية أو لاتينية مع التشكيل) فقط.
 * مشترك بين الواجهة والخادم ليتطابق التحقق في الطرفين.
 */
export const FULL_NAME_MAX = 80;

const ALLOWED = /^[\p{L}\p{M}' .-]+$/u;

export function normalizeFullName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** يعيد رسالة الخطأ، أو null إن كان الاسم صالحاً. */
export function fullNameError(raw: string): string | null {
  const name = normalizeFullName(raw);
  if (!name) return "يرجى كتابة اسمك الكامل";
  if (name.length > FULL_NAME_MAX) return `الاسم طويل جداً (الحد ${FULL_NAME_MAX} حرفاً)`;
  if (!ALLOWED.test(name)) return "الاسم يجب أن يحتوي على أحرف فقط";
  const parts = name.split(" ");
  if (parts.length < 2 || parts.some((p) => p.replace(/[\p{M}'.-]/gu, "").length < 2)) {
    return "يرجى كتابة الاسم الكامل (الاسم والكنية على الأقل)";
  }
  return null;
}

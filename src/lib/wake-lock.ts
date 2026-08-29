/**
 * تفضيل «إبقاء الشاشة مضيئة» — مصدر الحقيقة الوحيد لقفل الشاشة (Screen Wake Lock).
 *
 * على غرار وحدة حجم الخط (`lyrics-font.ts`): مفتاح تخزين + قراءة/حفظ مغلّفة بـ try/catch
 * لتعمل في التصفّح الخاص. القفل نفسه طلبٌ نشط للجهاز، لذا يُطلب من مكوّن عميل بعد التركيب
 * (لا يوجد سكربت منع وميض كما في حجم الخط).
 */

/** مفتاح حفظ آخر اختيار للمستخدم في localStorage. */
export const WAKE_LOCK_STORAGE_KEY = "arabic-lyrics:keep-awake";

/** هل واجهة Screen Wake Lock مدعومة في هذا المتصفّح؟ */
export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/** يقرأ التفضيل المحفوظ؛ يُعيد false عند الغياب أو تعطّل التخزين. */
export function readStoredWakeLockPref(): boolean {
  try {
    return localStorage.getItem(WAKE_LOCK_STORAGE_KEY) === "1";
  } catch {
    // قد يكون التخزين معطّلًا (تصفّح خاص) — نعتبره مطفأً.
    return false;
  }
}

/** يحفظ التفضيل؛ يتجاهل الفشل بصمت (تصفّح خاص). */
export function persistWakeLockPref(on: boolean): void {
  try {
    localStorage.setItem(WAKE_LOCK_STORAGE_KEY, on ? "1" : "0");
  } catch {
    // نُبقي التغيير للجلسة الحالية فقط.
  }
}

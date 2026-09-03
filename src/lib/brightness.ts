// ─────────────────────────────────────────────────────────────────────────────
// سطوع الشاشة أثناء القراءة — مصدر واحد للحقيقة يتشاركه المتحكّم وسكربت منع الوميض.
//
// لا تتيح المتصفّحات ضبط سطوع الجهاز فعليًا، فنُحاكيه بطبقة تعتيم سوداء فوق الصفحة
// شفافيّتها = ‏(1 − السطوع). السطوع كسر بين ‏BRIGHTNESS_MIN و‏1 (سطوع كامل بلا تعتيم)،
// يُطبَّق كمتغيّر CSS ‏`--screen-dim` على جذر الصفحة تقرؤه طبقة التعتيم. يُحفظ الاختيار
// في localStorage فيبقى ثابتًا عبر الجلسات. سكربت منع الوميض في layout يضبطه مبكرًا.
// ─────────────────────────────────────────────────────────────────────────────

/** السطوع الافتراضي: سطوع كامل بلا تعتيم. */
export const BRIGHTNESS_DEFAULT = 1;

/** أدنى سطوع مسموح (أقصى تعتيم = 0.7). */
export const BRIGHTNESS_MIN = 0.3;

/** أقصى سطوع (بلا تعتيم). */
export const BRIGHTNESS_MAX = 1;

/** خطوة تغيّر السطوع في شريط التمرير. */
export const BRIGHTNESS_STEP = 0.05;

/** مفتاح التخزين في localStorage. */
export const BRIGHTNESS_STORAGE_KEY = "screen-brightness";

/** متغيّر CSS الذي تقرؤه طبقة التعتيم (شفافيّة السواد = 1 − السطوع). */
export const BRIGHTNESS_DIM_CSS_VAR = "--screen-dim";

/** يُقيّد قيمة السطوع ضمن الحدود المسموحة، ويُرجع الافتراضي لأي قيمة غير صالحة. */
export function clampBrightness(value: number): number {
  if (!Number.isFinite(value)) return BRIGHTNESS_DEFAULT;
  return Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, value));
}

/** يحوّل السطوع إلى شفافيّة طبقة التعتيم (0 = بلا تعتيم). */
export function brightnessToDim(brightness: number): number {
  return Math.round((BRIGHTNESS_MAX - clampBrightness(brightness)) * 1000) / 1000;
}

/** يقرأ السطوع المحفوظ من localStorage (يُرجع الافتراضي إن تعذّر). */
export function readStoredBrightness(): number {
  try {
    const raw = localStorage.getItem(BRIGHTNESS_STORAGE_KEY);
    if (raw === null) return BRIGHTNESS_DEFAULT;
    return clampBrightness(parseFloat(raw));
  } catch {
    return BRIGHTNESS_DEFAULT;
  }
}

/** سكربت مضمّن (inline) يُطبّق السطوع المحفوظ قبل الرسم لمنع وميض التعتيم. */
export const BRIGHTNESS_NO_FLASH_SCRIPT = `(function(){try{var v=parseFloat(localStorage.getItem(${JSON.stringify(
  BRIGHTNESS_STORAGE_KEY,
)}));if(v>=${BRIGHTNESS_MIN}&&v<=${BRIGHTNESS_MAX}){document.documentElement.style.setProperty(${JSON.stringify(
  BRIGHTNESS_DIM_CSS_VAR,
)},String(Math.round((${BRIGHTNESS_MAX}-v)*1000)/1000));}}catch(e){}})();`;

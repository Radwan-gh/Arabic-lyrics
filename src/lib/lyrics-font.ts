// ─────────────────────────────────────────────────────────────────────────────
// حجم خط نص الأناشيد — مصدر واحد للحقيقة يتشاركه متحكّم الحجم وسكربت منع الوميض.
//
// الحجم مُعامِل تكبير (scale) يُطبَّق كمتغيّر CSS ‏`--lyrics-scale` على جذر الصفحة،
// فينعكس على كل حاويات النص التي تستخدم `lyricsProseCls` (صفحة النشيد، القارئ دون
// اتصال، أجسام القوائم) دفعةً واحدة. يُحفظ الاختيار في localStorage فيبقى ثابتًا
// عبر كل الأناشيد والجلسات.
// ─────────────────────────────────────────────────────────────────────────────

/** مستويات التكبير المتاحة، من الأصغر إلى الأكبر. القيمة 1 هي الحجم الافتراضي (text-lg). */
export const LYRICS_SCALE_LEVELS = [0.85, 1, 1.15, 1.3, 1.5, 1.75] as const;

/** الحجم الافتراضي عند عدم وجود اختيار محفوظ. */
export const LYRICS_SCALE_DEFAULT = 1;

export const LYRICS_SCALE_MIN = LYRICS_SCALE_LEVELS[0];
export const LYRICS_SCALE_MAX = LYRICS_SCALE_LEVELS[LYRICS_SCALE_LEVELS.length - 1];

/** مفتاح التخزين في localStorage. */
export const LYRICS_SCALE_STORAGE_KEY = "lyrics-font-scale";

/** متغيّر CSS الذي يقرؤه `lyricsProseCls`. */
export const LYRICS_SCALE_CSS_VAR = "--lyrics-scale";

/** يُقيّد قيمة التكبير ضمن الحدود المسموحة، ويُرجع الافتراضي لأي قيمة غير صالحة. */
export function clampLyricsScale(value: number): number {
  if (!Number.isFinite(value)) return LYRICS_SCALE_DEFAULT;
  return Math.min(LYRICS_SCALE_MAX, Math.max(LYRICS_SCALE_MIN, value));
}

/** يُرجع أقرب مستوى في اتجاه معيّن (+1 للتكبير، -1 للتصغير). */
export function stepLyricsScale(current: number, direction: 1 | -1): number {
  const clamped = clampLyricsScale(current);
  // أقرب مستوى للقيمة الحالية (تحسّبًا لقيمة قديمة خارج الشبكة).
  let idx = 0;
  let best = Infinity;
  LYRICS_SCALE_LEVELS.forEach((level, i) => {
    const d = Math.abs(level - clamped);
    if (d < best) {
      best = d;
      idx = i;
    }
  });
  const next = Math.min(LYRICS_SCALE_LEVELS.length - 1, Math.max(0, idx + direction));
  return LYRICS_SCALE_LEVELS[next];
}

/** يقرأ التكبير المحفوظ من localStorage (يُرجع الافتراضي إن تعذّر). */
export function readStoredLyricsScale(): number {
  try {
    const raw = localStorage.getItem(LYRICS_SCALE_STORAGE_KEY);
    if (raw === null) return LYRICS_SCALE_DEFAULT;
    return clampLyricsScale(parseFloat(raw));
  } catch {
    return LYRICS_SCALE_DEFAULT;
  }
}

/** سكربت مضمّن (inline) يُطبّق الحجم المحفوظ قبل الرسم لمنع وميض تغيّر الحجم. */
export const LYRICS_SCALE_NO_FLASH_SCRIPT = `(function(){try{var v=parseFloat(localStorage.getItem(${JSON.stringify(
  LYRICS_SCALE_STORAGE_KEY,
)}));if(v>=${LYRICS_SCALE_MIN}&&v<=${LYRICS_SCALE_MAX}){document.documentElement.style.setProperty(${JSON.stringify(
  LYRICS_SCALE_CSS_VAR,
)},String(v));}}catch(e){}})();`;

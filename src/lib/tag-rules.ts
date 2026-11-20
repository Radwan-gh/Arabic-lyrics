// قواعد الوسوم المشتركة بين الخادم والجهاز (ملف نقيّ بلا اعتماديات خادم).
import { z } from "zod";
import { normalizeArabic } from "./arabic-search";

/** أقصى عدد وسوم للنشيد الواحد. */
export const MAX_TAGS = 10;
/** أقصى طول للوسم الواحد بعد التنظيف. */
export const MAX_TAG_LEN = 30;

/** حقل الوسوم في مسارات الإضافة/التعديل الكاملة (السلوك القائم نفسه). */
export const tagsInputField = z.array(z.string().trim().max(MAX_TAG_LEN)).max(MAX_TAGS);

/** وسم واحد في التعديل السريع: يُنظَّف ثم يُشترط ألا يكون فارغًا. */
export const quickTagField = z
  .string()
  .transform(cleanTag)
  .pipe(z.string().min(1, "الوسم فارغ").max(MAX_TAG_LEN, `الوسم أطول من ${MAX_TAG_LEN} حرفًا`));

/** يحذف المسافات الزائدة في الأطراف والمكررة في الوسط. */
export function cleanTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}

/** مفتاح المقارنة: «مَديح» و«مديح» و«المديح ‎» بصيغ الحروف المختلفة تُعدّ وسمًا واحدًا. */
export function tagKey(tag: string): string {
  return normalizeArabic(cleanTag(tag)).toLowerCase();
}

/**
 * يُرجع الوسم بصيغته الموجودة مسبقًا إن طابق أحد `known` بعد التطبيع،
 * وإلا يُرجع النص المُنظَّف كوسم جديد. يمنع تكاثر صيغ مختلفة للوسم نفسه.
 */
export function resolveTag(input: string, known: readonly string[]): string {
  const key = tagKey(input);
  return known.find((t) => tagKey(t) === key) ?? cleanTag(input);
}

/** هل `tags` يحوي وسمًا يطابق `tag` بعد التطبيع؟ */
export function hasTag(tags: readonly string[], tag: string): boolean {
  const key = tagKey(tag);
  return tags.some((t) => tagKey(t) === key);
}

/**
 * يطبّق إضافة/إزالة على وسوم نشيد: الإزالة أولاً ثم الإضافة دون تكرار.
 * `overflow` = true إن كانت النتيجة ستتجاوز MAX_TAGS (فلا تُطبَّق الإضافة الزائدة).
 */
export function applyTagChanges(
  current: readonly string[],
  { add = [], remove = [] }: { add?: readonly string[]; remove?: readonly string[] },
  known: readonly string[] = [],
): { tags: string[]; overflow: boolean } {
  const removeKeys = new Set(remove.map(tagKey));
  const tags = current.filter((t) => !removeKeys.has(tagKey(t)));
  let overflow = false;
  for (const raw of add) {
    const tag = resolveTag(raw, [...tags, ...known]);
    if (hasTag(tags, tag)) continue;
    if (tags.length >= MAX_TAGS) {
      overflow = true;
      continue;
    }
    tags.push(tag);
  }
  return { tags, overflow };
}

/** عدد الوسوم الأخيرة المحفوظة لكل مستخدم. */
export const MAX_RECENT_TAGS = 12;

/** يضع `used` في مقدّمة قائمة الأخيرة (الأحدث أولاً) دون تكرار، ويقصّها إلى MAX_RECENT_TAGS. */
export function pushRecentTags(recent: readonly string[], used: readonly string[]): string[] {
  const out: string[] = [];
  for (const tag of [...used, ...recent]) {
    if (!hasTag(out, tag)) out.push(tag);
  }
  return out.slice(0, MAX_RECENT_TAGS);
}

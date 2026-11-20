import { prisma } from "./prisma";
import { pushRecentTags } from "./tag-rules";

export interface TagCount {
  tag: string;
  count: number;
}

/** كل الوسوم مع عدد الأناشيد المرتبطة بكل وسم، الأكثر استخدامًا أولاً.
 * يُستخدم في إدارة الوسوم وفي شريط تصفية الوسوم بالرئيسية. */
export async function getTagCounts(): Promise<TagCount[]> {
  return prisma.$queryRaw<TagCount[]>`
    SELECT tag, COUNT(*)::int AS count
    FROM "Lyrics", unnest(tags) AS tag
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `;
}

/** كل الوسوم المستخدمة (بلا تكرار، أبجديًا). */
export async function getAllTags(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT tag
    FROM "Lyrics", unnest(tags) AS tag
    ORDER BY tag ASC
  `;
  return rows.map((r) => r.tag);
}

/** يسجّل وسومًا أضافها المستخدم في مقدّمة «آخر ما استخدمه». لا يُفشل الطلب الأصلي إن تعذّر. */
export async function recordRecentTags(userId: string, used: string[]): Promise<void> {
  if (used.length === 0) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { recentTags: true } });
    if (!user) return;
    await prisma.user.update({
      where: { id: userId },
      data: { recentTags: pushRecentTags(user.recentTags, used) },
      select: { id: true },
    });
  } catch {
    // ترتيب الاقتراحات ثانوي؛ الوسم نفسه حُفظ.
  }
}

/** آخر وسوم المستخدم (الأحدث أولاً)، مقتصرةً على الوسوم التي ما زالت مستخدمة. */
export async function getRecentTags(userId: string, existing: readonly string[]): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { recentTags: true } });
  if (!user) return [];
  const live = new Set(existing);
  return user.recentTags.filter((t) => live.has(t));
}

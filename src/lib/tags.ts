import { prisma } from "./prisma";

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

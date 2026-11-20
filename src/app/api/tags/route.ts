import { NextResponse } from "next/server";
import { getAllTags, getRecentTags, getTagCounts } from "@/lib/tags";
import { getCurrentUser } from "@/lib/session";

/**
 * قائمة الوسوم. افتراضيًا `{tags: string[]}` أبجديًا (منتقي الوسوم وشريط التصفية).
 * مع `?withCounts=1` تُعاد `{tags: {tag, count}[], recent: string[]}`: الأكثر استخدامًا
 * أولاً، وآخر وسوم أضافها المستخدم الحالي (فارغة للزائر) — اقتراحات التعديل السريع.
 */
export async function GET(req: Request) {
  const withCounts = new URL(req.url).searchParams.get("withCounts") === "1";
  if (withCounts) {
    const [tags, session] = await Promise.all([getTagCounts(), getCurrentUser()]);
    const recent = session ? await getRecentTags(session.userId, tags.map((t) => t.tag)) : [];
    return NextResponse.json({ tags, recent });
  }
  return NextResponse.json({ tags: await getAllTags() });
}

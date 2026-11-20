import { NextResponse } from "next/server";
import { getAllTags, getTagCounts } from "@/lib/tags";

/**
 * قائمة الوسوم. افتراضيًا `{tags: string[]}` أبجديًا (منتقي الوسوم وشريط التصفية).
 * مع `?withCounts=1` تُعاد `{tags: {tag, count}[]}` الأكثر استخدامًا أولاً
 * (اقتراحات التعديل السريع للوسوم).
 */
export async function GET(req: Request) {
  const withCounts = new URL(req.url).searchParams.get("withCounts") === "1";
  if (withCounts) {
    return NextResponse.json({ tags: await getTagCounts() });
  }
  return NextResponse.json({ tags: await getAllTags() });
}

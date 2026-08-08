import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { findDuplicateLyrics, findLyricsSuggestions } from "@/lib/lyrics";

// GET /api/lyrics/check?title=...&excludeId=...
// يرجّع:
//   matches: الأناشيد المطابقة تماماً للعنوان (بعد التطبيع) — لمنع التكرار.
//   suggestions: أناشيد موجودة يحتوي نصّها الكامل على الكلمة المكتوبة — لعرض
//     قائمة اقتراحات حيّة أسفل حقل العنوان (باستثناء المطابقات التامة).
export async function GET(req: Request) {
  const session = await getCurrentUser();
  if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim() || "";
  const excludeId = searchParams.get("excludeId")?.trim() || undefined;

  if (!title) {
    return NextResponse.json({ matches: [], suggestions: [] });
  }

  const matches = await findDuplicateLyrics(title, excludeId);
  const excludeIds = [...matches.map((m) => m.id), ...(excludeId ? [excludeId] : [])];
  const suggestions = await findLyricsSuggestions(title, excludeIds);

  return NextResponse.json({ matches, suggestions });
}

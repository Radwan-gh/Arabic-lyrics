import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { findDuplicateLyrics } from "@/lib/lyrics";

// GET /api/lyrics/check?title=...&excludeId=...
// يرجّع الأناشيد الموجودة مسبقاً بنفس العنوان (بعد التطبيع) لكشف التكرار
// أثناء الكتابة وعرض الموجود فعلاً.
export async function GET(req: Request) {
  const session = await getCurrentUser();
  if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim() || "";
  const excludeId = searchParams.get("excludeId")?.trim() || undefined;

  const matches = title ? await findDuplicateLyrics(title, excludeId) : [];
  return NextResponse.json({ matches });
}

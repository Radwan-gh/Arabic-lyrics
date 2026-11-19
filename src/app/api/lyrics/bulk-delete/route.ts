import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canModifyLyrics } from "@/lib/lyrics-permissions";

/** حدّ أعلى لعدد الأناشيد في طلب حذف واحد (حماية من الطلبات الضخمة). */
const MAX_IDS = 500;

const schema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_IDS),
});

/**
 * حذف عدة أناشيد دفعة واحدة (التحديد المتعدد في القائمة). تُطبَّق صلاحية الحذف
 * على كل نشيد منفردًا: يُحذف ما يملك المستخدم حذفه، ويُعاد الباقي في `failed`
 * (لا صلاحية أو غير موجود) ليُرجعه الجهاز إلى القائمة.
 */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const ids = [...new Set(parsed.data.ids)];
  const rows = await prisma.lyrics.findMany({
    where: { id: { in: ids } },
    select: { id: true, createdById: true },
  });
  const allowed = rows.filter((r) => canModifyLyrics(session, r.createdById)).map((r) => r.id);

  if (allowed.length > 0) {
    await prisma.lyrics.deleteMany({ where: { id: { in: allowed } } });
  }

  const deletedSet = new Set(allowed);
  return NextResponse.json({ deleted: allowed, failed: ids.filter((id) => !deletedSet.has(id)) });
}

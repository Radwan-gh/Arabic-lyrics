import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canModifyLyrics } from "@/lib/lyrics-permissions";
import { getAllTags, recordRecentTags } from "@/lib/tags";
import { MAX_TAGS, applyTagChanges, quickTagField, resolveTag } from "@/lib/tag-rules";

/** حدّ أعلى لعدد الأناشيد في طلب واحد (كما في bulk-delete). */
const MAX_IDS = 500;

const schema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_IDS),
  add: z.array(quickTagField).min(1).max(MAX_TAGS),
});

/**
 * إضافة وسم أو أكثر لعدة أناشيد دفعة واحدة (التحديد المتعدد في القائمة).
 * تُطبَّق الصلاحية على كل نشيد منفردًا، ويُتخطّى النشيد الذي لا يملك المستخدم
 * تعديله أو الذي ستتجاوز وسومه الحد الأقصى؛ فيُعاد في `failed` مع السبب.
 * `updated` يحوي الوسوم الجديدة لكل نشيد عُدِّل، ليحدّث الجهاز القائمة مباشرة.
 */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const ids = [...new Set(parsed.data.ids)];
  const [rows, known] = await Promise.all([
    prisma.lyrics.findMany({ where: { id: { in: ids } }, select: { id: true, tags: true, createdById: true } }),
    getAllTags(),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));

  const updated: { id: string; tags: string[] }[] = [];
  const failed: { id: string; reason: "not_found" | "forbidden" | "limit" }[] = [];
  const writes = [];

  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      failed.push({ id, reason: "not_found" });
      continue;
    }
    if (!canModifyLyrics(session, row.createdById)) {
      failed.push({ id, reason: "forbidden" });
      continue;
    }
    const { tags, overflow } = applyTagChanges(row.tags, { add: parsed.data.add }, known);
    if (overflow) {
      failed.push({ id, reason: "limit" });
      continue;
    }
    updated.push({ id, tags });
    writes.push(prisma.lyrics.update({ where: { id }, data: { tags }, select: { id: true } }));
  }

  if (writes.length > 0) {
    await prisma.$transaction(writes);
    await recordRecentTags(
      session.userId,
      parsed.data.add.map((t) => resolveTag(t, known)),
    );
  }

  return NextResponse.json({ updated, failed });
}

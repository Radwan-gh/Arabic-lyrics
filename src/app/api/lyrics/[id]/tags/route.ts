import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canModifyLyrics } from "@/lib/lyrics-permissions";
import { getAllTags } from "@/lib/tags";
import { MAX_TAGS, applyTagChanges, quickTagField } from "@/lib/tag-rules";

const schema = z
  .object({
    add: z.array(quickTagField).max(MAX_TAGS).optional(),
    remove: z.array(z.string().max(200)).max(50).optional(),
  })
  .refine((v) => (v.add?.length ?? 0) + (v.remove?.length ?? 0) > 0, { message: "لا تغيير مطلوب" });

/**
 * تعديل سريع لوسوم نشيد واحد دون إعادة إرسال العنوان والمحتوى.
 * يُعدَّل حقل `tags` وحده: لا تنقية للمحتوى ولا فحص تكرار العنوان، و`searchText`
 * لا يتضمن الوسوم فلا يُعاد بناؤه. الوسم المكتوب بصيغة مختلفة لوسم موجود
 * (تشكيل، صور الألف...) يُستبدل بالصيغة الموجودة.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();

  const existing = await prisma.lyrics.findUnique({ where: { id }, select: { tags: true, createdById: true } });
  if (!existing) {
    return NextResponse.json({ error: "الأنشودة غير موجودة" }, { status: 404 });
  }
  if (!canModifyLyrics(session, existing.createdById)) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل وسوم هذه الأنشودة" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const known = parsed.data.add?.length ? await getAllTags() : [];
  const { tags, overflow } = applyTagChanges(existing.tags, parsed.data, known);
  if (overflow) {
    return NextResponse.json(
      { error: `الحد الأقصى ${MAX_TAGS} وسوم للأنشودة`, tags: existing.tags },
      { status: 422 },
    );
  }

  const updated = await prisma.lyrics.update({ where: { id }, data: { tags }, select: { tags: true } });
  return NextResponse.json({ tags: updated.tags });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function requireAdmin() {
  const session = await getCurrentUser();
  return session?.role === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const rows = await prisma.$queryRaw<{ tag: string; count: number }[]>`
    SELECT tag, COUNT(*)::int AS count
    FROM "Lyrics", unnest(tags) AS tag
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `;

  return NextResponse.json({ tags: rows });
}

const renameSchema = z.object({
  tag: z.string().trim().min(1).max(30),
  newTag: z.string().trim().min(1, "الاسم الجديد مطلوب").max(30),
});

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const { tag, newTag } = parsed.data;
  if (tag === newTag) {
    return NextResponse.json({ ok: true, affected: 0 });
  }

  const affected = await prisma.lyrics.findMany({
    where: { tags: { has: tag } },
    select: { id: true, tags: true },
  });

  await Promise.all(
    affected.map((item) => {
      const nextTags = Array.from(new Set(item.tags.map((t) => (t === tag ? newTag : t))));
      return prisma.lyrics.update({ where: { id: item.id }, data: { tags: nextTags } });
    }),
  );

  return NextResponse.json({ ok: true, affected: affected.length });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag")?.trim();
  if (!tag) {
    return NextResponse.json({ error: "الوسم مطلوب" }, { status: 400 });
  }

  const affected = await prisma.lyrics.findMany({
    where: { tags: { has: tag } },
    select: { id: true, tags: true },
  });

  await Promise.all(
    affected.map((item) =>
      prisma.lyrics.update({ where: { id: item.id }, data: { tags: item.tags.filter((t) => t !== tag) } }),
    ),
  );

  return NextResponse.json({ ok: true, affected: affected.length });
}

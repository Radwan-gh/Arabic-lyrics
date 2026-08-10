import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const bodySchema = z.object({ lyricsId: z.string().min(1) });

/** Add a nasheed to the current user's favorites (idempotent). */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const lyrics = await prisma.lyrics.findUnique({ where: { id: parsed.data.lyricsId }, select: { id: true } });
  if (!lyrics) {
    return NextResponse.json({ error: "الأنشودة غير موجودة" }, { status: 404 });
  }

  const created = await prisma.favorite
    .create({ data: { userId: session.userId, lyricsId: lyrics.id }, select: { id: true } })
    .catch(() => null); // unique constraint → already favorited

  return NextResponse.json({ ok: true, favorited: true, added: !!created }, { status: created ? 201 : 200 });
}

/** Remove a nasheed from the current user's favorites (idempotent). */
export async function DELETE(req: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.favorite
    .delete({ where: { userId_lyricsId: { userId: session.userId, lyricsId: parsed.data.lyricsId } } })
    .catch(() => null); // not present → no-op

  return NextResponse.json({ ok: true, favorited: false });
}

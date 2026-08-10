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

  // Append at the end of the user's custom order.
  const last = await prisma.favorite.findFirst({
    where: { userId: session.userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const created = await prisma.favorite
    .create({
      data: { userId: session.userId, lyricsId: lyrics.id, position: (last?.position ?? -1) + 1 },
      select: { id: true },
    })
    .catch(() => null); // unique constraint → already favorited

  return NextResponse.json({ ok: true, favorited: true, added: !!created }, { status: created ? 201 : 200 });
}

const reorderSchema = z.object({ order: z.array(z.string().min(1)).max(1000) });

/** Persist the user's custom favorite order from the supplied lyrics-id list. */
export async function PATCH(req: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.order.map((lyricsId, index) =>
      prisma.favorite.updateMany({
        where: { userId: session.userId, lyricsId },
        data: { position: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
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

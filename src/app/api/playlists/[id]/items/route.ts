import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function requireOwner(id: string, userId: string) {
  const playlist = await prisma.playlist.findUnique({ where: { id }, select: { ownerId: true } });
  return !!playlist && playlist.ownerId === userId;
}

const addSchema = z.object({ lyricsId: z.string().min(1) });

/** Append a lyrics entry to the playlist (idempotent — already-present entries are a no-op). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await params;
  if (!(await requireOwner(id, session.userId))) {
    return NextResponse.json({ error: "الوصلة غير موجودة" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const lyrics = await prisma.lyrics.findUnique({ where: { id: parsed.data.lyricsId }, select: { id: true } });
  if (!lyrics) {
    return NextResponse.json({ error: "الأنشودة غير موجودة" }, { status: 404 });
  }

  const last = await prisma.playlistItem.findFirst({
    where: { playlistId: id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const item = await prisma.playlistItem
    .create({
      data: { playlistId: id, lyricsId: lyrics.id, position: (last?.position ?? -1) + 1 },
    })
    .catch(() => null); // unique constraint → already in playlist

  return NextResponse.json({ ok: true, added: !!item }, { status: item ? 201 : 200 });
}

const removeSchema = z.object({ lyricsId: z.string().min(1) });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await params;
  if (!(await requireOwner(id, session.userId))) {
    return NextResponse.json({ error: "الوصلة غير موجودة" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.playlistItem
    .delete({ where: { playlistId_lyricsId: { playlistId: id, lyricsId: parsed.data.lyricsId } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}

const reorderSchema = z.object({ order: z.array(z.string().min(1)).max(500) });

/** Persist a new order by rewriting each item's position from the supplied lyrics-id list. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await params;
  if (!(await requireOwner(id, session.userId))) {
    return NextResponse.json({ error: "الوصلة غير موجودة" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.order.map((lyricsId, index) =>
      prisma.playlistItem.updateMany({
        where: { playlistId: id, lyricsId },
        data: { position: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}

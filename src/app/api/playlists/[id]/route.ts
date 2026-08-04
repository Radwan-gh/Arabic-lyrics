import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function ownedPlaylistId(id: string, userId: string) {
  const playlist = await prisma.playlist.findUnique({ where: { id }, select: { ownerId: true } });
  return playlist && playlist.ownerId === userId ? id : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { lyrics: { select: { id: true, title: true, artist: true, album: true } } },
      },
    },
  });

  if (!playlist || playlist.ownerId !== session.userId) {
    return NextResponse.json({ error: "الوصلة غير موجودة" }, { status: 404 });
  }
  return NextResponse.json({ playlist });
}

const updateSchema = z.object({
  title: z.string().trim().min(1, "اسم الوصلة مطلوب").max(120).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isPublic: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await params;
  if (!(await ownedPlaylistId(id, session.userId))) {
    return NextResponse.json({ error: "الوصلة غير موجودة" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const data: { title?: string; description?: string | null; isPublic?: boolean } = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null;
  if (parsed.data.isPublic !== undefined) data.isPublic = parsed.data.isPublic;

  const playlist = await prisma.playlist.update({
    where: { id },
    data,
    select: { id: true, title: true, description: true, isPublic: true, shareToken: true },
  });

  return NextResponse.json({ playlist });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const { id } = await params;
  if (!(await ownedPlaylistId(id, session.userId))) {
    return NextResponse.json({ error: "الوصلة غير موجودة" }, { status: 404 });
  }

  await prisma.playlist.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }

  const playlists = await prisma.playlist.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      isPublic: true,
      shareToken: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json({ playlists });
}

const createSchema = z.object({
  title: z.string().trim().min(1, "اسم القائمة مطلوب").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const playlist = await prisma.playlist.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      ownerId: session.userId,
    },
    select: { id: true, title: true, description: true, isPublic: true, shareToken: true, createdAt: true },
  });

  return NextResponse.json({ playlist }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getLyricsAndIncrementViews } from "@/lib/lyrics";
import { sanitizeLyricsHtml } from "@/lib/sanitize-lyrics";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lyrics = await getLyricsAndIncrementViews(id);

  if (!lyrics) {
    return NextResponse.json({ error: "الكلمات غير موجودة" }, { status: 404 });
  }
  return NextResponse.json(lyrics);
}

const updateSchema = z.object({
  title: z.string().trim().min(1, "العنوان مطلوب").max(200),
  artist: z.string().trim().max(200).optional().or(z.literal("")),
  album: z.string().trim().max(200).optional().or(z.literal("")),
  content: z.string().min(1, "نص الكلمات مطلوب").max(20000),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
});

async function canModify(id: string) {
  const session = await getCurrentUser();
  if (!session) return { session, allowed: false };
  if (session.role === "ADMIN") return { session, allowed: true };
  if (session.role === "EDITOR") {
    const existing = await prisma.lyrics.findUnique({ where: { id }, select: { createdById: true } });
    return { session, allowed: existing?.createdById === session.userId };
  }
  return { session, allowed: false };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { allowed } = await canModify(id);
  if (!allowed) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل هذه الكلمات" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const { title, artist, album, content, tags } = parsed.data;

  const cleanedContent = sanitizeLyricsHtml(content);
  if (!cleanedContent.replace(/<[^>]*>/g, "").trim()) {
    return NextResponse.json({ error: "نص الكلمات مطلوب" }, { status: 400 });
  }

  const lyrics = await prisma.lyrics
    .update({
      where: { id },
      data: { title, artist: artist || null, album: album || null, content: cleanedContent, tags: tags ?? [] },
    })
    .catch(() => null);

  if (!lyrics) {
    return NextResponse.json({ error: "الكلمات غير موجودة" }, { status: 404 });
  }
  return NextResponse.json(lyrics);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { allowed } = await canModify(id);
  if (!allowed) {
    return NextResponse.json({ error: "غير مصرح لك بحذف هذه الكلمات" }, { status: 403 });
  }

  await prisma.lyrics.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

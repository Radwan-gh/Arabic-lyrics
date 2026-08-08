import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sanitizeLyricsHtml } from "@/lib/sanitize-lyrics";
import { buildLyricsWhere } from "@/lib/lyrics-search";
import { buildSearchText, normalizeArabic } from "@/lib/arabic-search";
import { findDuplicateLyrics } from "@/lib/lyrics";

const PAGE_SIZE = 12;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const tags = (searchParams.get("tags")?.split(",") ?? []).map((t) => t.trim()).filter(Boolean);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const where = buildLyricsWhere(q, tags);

  const [items, total] = await Promise.all([
    prisma.lyrics.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        artist: true,
        album: true,
        tags: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.lyrics.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

const lyricsSchema = z.object({
  title: z.string().trim().min(1, "العنوان مطلوب").max(200),
  artist: z.string().trim().max(200).optional().or(z.literal("")),
  album: z.string().trim().max(200).optional().or(z.literal("")),
  content: z.string().min(1, "نص الأنشودة مطلوب").max(20000),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  // عند true يتجاوز المستخدم تحذير التكرار ويُضيف عمداً.
  allowDuplicate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session || (session.role !== "ADMIN" && session.role !== "EDITOR")) {
    return NextResponse.json({ error: "غير مصرح لك بإضافة أناشيد" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = lyricsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const { title, artist, album, content, tags, allowDuplicate } = parsed.data;

  const cleanedContent = sanitizeLyricsHtml(content);
  if (!cleanedContent.replace(/<[^>]*>/g, "").trim()) {
    return NextResponse.json({ error: "نص الأنشودة مطلوب" }, { status: 400 });
  }

  // كشف التكرار حسب العنوان المُطبَّع. يُرجع 409 مع الأناشيد المطابقة ما لم
  // يؤكّد المستخدم الإضافة عمداً (allowDuplicate).
  if (!allowDuplicate) {
    const duplicates = await findDuplicateLyrics(title);
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: "يوجد نشيد بنفس العنوان مسبقاً", duplicates },
        { status: 409 },
      );
    }
  }

  const lyrics = await prisma.lyrics.create({
    data: {
      title,
      titleNormalized: normalizeArabic(title),
      artist: artist || null,
      album: album || null,
      content: cleanedContent,
      tags: tags ?? [],
      searchText: buildSearchText({ title, artist, album, content: cleanedContent }),
      createdById: session.userId,
    },
  });

  return NextResponse.json(lyrics, { status: 201 });
}

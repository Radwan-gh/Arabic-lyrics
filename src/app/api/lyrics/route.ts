import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getFavoritedLyricsIds } from "@/lib/favorites";
import { sanitizeLyricsHtml } from "@/lib/sanitize-lyrics";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildLyricsWhere, buildLyricsOrderBy, parseLyricsSort, LYRICS_PAGE_SIZE } from "@/lib/lyrics-search";
import { buildSearchText, normalizeArabic } from "@/lib/arabic-search";
import { findArabicMatch, splitAtMatch, buildContentSnippet } from "@/lib/arabic-highlight";
import { findDuplicateLyrics } from "@/lib/lyrics";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const tags = (searchParams.get("tags")?.split(",") ?? []).map((t) => t.trim()).filter(Boolean);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const sort = parseLyricsSort(searchParams.get("sort"), "date_desc");

  const where = buildLyricsWhere(q, tags);
  const session = await getCurrentUser();

  const [rows, total] = await Promise.all([
    prisma.lyrics.findMany({
      where,
      orderBy: buildLyricsOrderBy(sort),
      skip: (page - 1) * LYRICS_PAGE_SIZE,
      take: LYRICS_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        artist: true,
        album: true,
        tags: true,
        createdAt: true,
        // يُستخدم أيضًا لبناء المقتطف المظلَّل (راجع lib/arabic-highlight) ولعرض
        // الأنشودة كاملة عند التمرير اللانهائي في الرئيسية — لا يُعاد خامًا.
        content: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.lyrics.count({ where }),
  ]);

  const favoritedIds = session ? await getFavoritedLyricsIds(session.userId, rows.map((r) => r.id)) : new Set<string>();

  // تظليل: العنوان أولًا، وإلا مقتطف من الكلمات — مطابقةً لتجربة شاشة البحث
  // الكاملة على الموبايل. بلا استعلام (q فارغة) لا حاجة لأيّ من هذا.
  const items = rows.map(({ content, ...rest }) => {
    const base = { ...rest, contentHtml: renderLyricsHtml(content), favorited: favoritedIds.has(rest.id) };
    if (!q) return { ...base, titleMatch: null, snippet: null };
    const titleSpan = findArabicMatch(rest.title, q);
    if (titleSpan) {
      return { ...base, titleMatch: splitAtMatch(rest.title, titleSpan), snippet: null };
    }
    return { ...base, titleMatch: null, snippet: buildContentSnippet(content, q) };
  });

  return NextResponse.json({
    items,
    total,
    page,
    pageSize: LYRICS_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / LYRICS_PAGE_SIZE)),
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

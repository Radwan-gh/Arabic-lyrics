import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildLyricsOrderBy } from "@/lib/lyrics-search";
import type { LyricsSyncResponse } from "@/lib/offline";

// مزامنة الأناشيد لقاعدة بيانات الجهاز (القراءة دون اتصال). بلا `since` تُرجع كل
// الأناشيد، ومعه ما تغيّر بعده فقط (حسب updatedAt). `order` يحمل دومًا كل المعرّفات
// الحالية بالترتيب الأبجدي كما تُرجعه القاعدة: منه يُشتقّ الترتيب على الجهاز، ويُعرف
// المحذوف (كل ما ليس فيه). كل الأناشيد ظاهرة للجميع (لا علم isPublic) فالمزامنة آمنة.
export const dynamic = "force-dynamic";

// هامش أمان لفروق التوقيت بين الاستجابة والكتابات المتزامنة معها: تكرار نشيد في
// مزامنتين لا يضرّ (يُستبدل)، أما إسقاطه فيُبقي نسخة قديمة على الجهاز.
const SINCE_MARGIN_MS = 60_000;

export async function GET(req: NextRequest) {
  const serverTime = new Date();
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  const changedWhere =
    since && !Number.isNaN(since.getTime())
      ? { updatedAt: { gte: new Date(since.getTime() - SINCE_MARGIN_MS) } }
      : {};

  const [rows, titleOrder] = await Promise.all([
    prisma.lyrics.findMany({
      where: changedWhere,
      select: {
        id: true,
        title: true,
        artist: true,
        album: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        content: true,
        viewCount: true,
        createdById: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.lyrics.findMany({
      orderBy: buildLyricsOrderBy("title_asc"),
      select: { id: true, title: true, titleNormalized: true },
    }),
  ]);

  // مجموعة التعادل: تتساوى فقط للعناوين المتطابقة (راجع titleGroup في lib/offline).
  let group = -1;
  const order: [string, number][] = titleOrder.map((r, i) => {
    const prev = titleOrder[i - 1];
    if (!prev || prev.titleNormalized !== r.titleNormalized || prev.title !== r.title) group++;
    return [r.id, group];
  });

  const payload: LyricsSyncResponse = {
    serverTime: serverTime.toISOString(),
    order,
    lyrics: rows.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      album: r.album,
      tags: r.tags,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      contentHtml: renderLyricsHtml(r.content),
      viewCount: r.viewCount,
      createdById: r.createdById,
      createdByName: r.createdBy?.name ?? null,
    })),
  };

  return NextResponse.json(payload);
}

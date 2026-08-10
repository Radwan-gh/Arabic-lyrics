import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import type { OfflineCollection } from "@/lib/offline";

// نقطة بيانات عامة للقراءة دون اتصال: تُرجع كامل مجموعة الأناشيد كـ JSON مع
// المحتوى المُنقّى، ليخزّنها الـ service worker فيتصفّحها المستخدم ويقرأها دون
// إنترنت. كل الأناشيد ظاهرة للجميع (لا علم isPublic على الجدول) فالتخزين آمن.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.lyrics.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      artist: true,
      album: true,
      tags: true,
      createdAt: true,
      content: true,
    },
  });

  const payload: OfflineCollection = {
    updatedAt: new Date().toISOString(),
    lyrics: rows.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      album: r.album,
      tags: r.tags,
      createdAt: r.createdAt.toISOString(),
      contentHtml: renderLyricsHtml(r.content),
    })),
  };

  return NextResponse.json(payload);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { compressedJson } from "@/lib/compressed-json";
import type { OfflineMe } from "@/lib/offline";

// بيانات المستخدم الخفيفة للقراءة دون اتصال: مفضّلته (بالترتيب الخاص وتاريخ
// الإضافة) ووصلاته (بمعرّفات عناصرها فقط، دون محتوى — يُحلّ من أناشيد الجهاز).
// البيانات خاصة — تُمسح من الجهاز عند تغيّر الجلسة (راجع offline-sync).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [favorites, playlists] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: session.userId },
      orderBy: { position: "asc" },
      select: { lyricsId: true, createdAt: true },
    }),
    prisma.playlist.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        createdAt: true,
        shareToken: true,
        items: { orderBy: { position: "asc" }, select: { lyricsId: true } },
      },
    }),
  ]);

  const payload: OfflineMe = {
    favorites: favorites.map((f) => ({ lyricsId: f.lyricsId, createdAt: f.createdAt.toISOString() })),
    playlists: playlists.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      isPublic: p.isPublic,
      createdAt: p.createdAt.toISOString(),
      shareToken: p.shareToken,
      itemIds: p.items.map((i) => i.lyricsId),
    })),
  };

  return compressedJson(req, payload);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { OfflineMe } from "@/lib/offline";

// بيانات المستخدم الخفيفة للقراءة دون اتصال: معرّفات المفضّلة (بالترتيب الخاص)
// وقوائمه (بمعرّفات عناصرها فقط، دون محتوى). يحلّ القارئ المحتوى من لقطة
// /api/public/lyrics. البيانات خاصة — يخزّنها الـ SW على الجهاز ويمسحها عند الخروج.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [favorites, playlists] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: session.userId },
      orderBy: { position: "asc" },
      select: { lyricsId: true },
    }),
    prisma.playlist.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        items: { orderBy: { position: "asc" }, select: { lyricsId: true } },
      },
    }),
  ]);

  const payload: OfflineMe = {
    updatedAt: new Date().toISOString(),
    favorites: favorites.map((f) => f.lyricsId),
    playlists: playlists.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      itemIds: p.items.map((i) => i.lyricsId),
    })),
  };

  return NextResponse.json(payload);
}

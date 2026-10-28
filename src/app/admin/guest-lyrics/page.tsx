import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { AdminGuestLyrics } from "@/components/AdminGuestLyrics";

export default async function AdminGuestLyricsPage() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") redirect("/");

  // أناشيد الزوار تُحفظ بلا createdById (راجع POST /api/lyrics).
  const lyrics = await prisma.lyrics.findMany({
    where: { createdById: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, artist: true, createdAt: true },
  });

  return <AdminGuestLyrics initialLyrics={lyrics.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))} />;
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PlaylistsView } from "@/components/PlaylistsView";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/playlists");

  const playlists = await prisma.playlist.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  const initial = playlists.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    isPublic: p.isPublic,
    createdAt: p.createdAt.toISOString(),
    itemCount: p._count.items,
  }));

  return <PlaylistsView initial={initial} />;
}

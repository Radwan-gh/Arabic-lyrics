import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { headers } from "next/headers";
import { isShellRequest } from "@/lib/offline";
import { PlaylistsPage as PlaylistsPageView } from "@/components/PlaylistPages";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/playlists");

  // هيكل للقراءة دون اتصال: الواجهة نفسها بلا بيانات، تملؤها بيانات الجهاز.
  if (isShellRequest(await headers())) return <PlaylistsPageView initial={null} />;

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

  return <PlaylistsPageView initial={initial} />;
}

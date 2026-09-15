import { prisma } from "@/lib/prisma";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildLyricsWhere } from "@/lib/lyrics-search";
import { getCurrentUser } from "@/lib/session";
import { getFavoritedLyricsIds } from "@/lib/favorites";
import { getTagCounts } from "@/lib/tags";
import { HomeScreen } from "@/components/HomeScreen";
import { HomeView } from "@/components/HomeView";
import type { HomeSsrData } from "@/hooks/use-offline-home";

const PAGE_SIZE = 12;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tags?: string; page?: string }>;
}) {
  const { q = "", tags: tagsParam = "", page: pageParam } = await searchParams;
  const tags = tagsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const page = Math.max(1, Number(pageParam) || 1);

  const where = buildLyricsWhere(q, tags);
  const isFiltered = Boolean(q) || tags.length > 0;

  const [items, total, grandTotal, session, tagCounts] = await Promise.all([
    prisma.lyrics.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, artist: true, album: true, tags: true, createdAt: true, content: true },
    }),
    prisma.lyrics.count({ where }),
    prisma.lyrics.count(),
    getCurrentUser(),
    getTagCounts(),
  ]);

  const favoritedIds = session
    ? await getFavoritedLyricsIds(session.userId, items.map((i) => i.id))
    : new Set<string>();

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ssr: HomeSsrData = {
    q,
    tags,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.album,
      tags: item.tags,
      createdAt: item.createdAt.toISOString(),
      contentHtml: renderLyricsHtml(item.content),
      favorited: favoritedIds.has(item.id),
    })),
    grandTotal,
    filteredTotal: total,
    isFiltered,
    tagCounts,
    page,
    pageCount,
    loggedIn: !!session,
  };

  return (
    <>
      <div className="sm:hidden">
        <HomeScreen ssr={ssr} />
      </div>
      <HomeView ssr={ssr} />
    </>
  );
}

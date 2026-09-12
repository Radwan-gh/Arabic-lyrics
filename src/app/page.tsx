import { prisma } from "@/lib/prisma";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildLyricsWhere, buildLyricsOrderBy, parseTitleSort, LYRICS_PAGE_SIZE } from "@/lib/lyrics-search";
import { getCurrentUser } from "@/lib/session";
import { getFavoritedLyricsIds } from "@/lib/favorites";
import { getTagCounts } from "@/lib/tags";
import { HomeScreen } from "@/components/HomeScreen";
import { HomeDesktopList } from "@/components/HomeDesktopList";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tags?: string; sort?: string }>;
}) {
  const { q = "", tags: tagsParam = "", sort: sortParam } = await searchParams;
  const tags = tagsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const sort = parseTitleSort(sortParam);

  const where = buildLyricsWhere(q, tags);
  const isFiltered = Boolean(q) || tags.length > 0;

  const [items, total, grandTotal, session, tagCounts] = await Promise.all([
    prisma.lyrics.findMany({
      where,
      orderBy: buildLyricsOrderBy(sort),
      take: LYRICS_PAGE_SIZE,
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

  const cards = items.map((item) => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    album: item.album,
    tags: item.tags,
    createdAt: item.createdAt.toISOString(),
    contentHtml: renderLyricsHtml(item.content),
    favorited: favoritedIds.has(item.id),
  }));

  const hasMore = items.length < total;

  return (
    <>
      <div className="sm:hidden">
        <HomeScreen
          query={q}
          selectedTags={tags}
          sort={sort}
          initialItems={cards}
          initialHasMore={hasMore}
          grandTotal={grandTotal}
          filteredTotal={total}
          isFiltered={isFiltered}
          tagCounts={tagCounts}
          loggedIn={!!session}
        />
      </div>

      <div className="hidden sm:block">
        <HomeDesktopList
          query={q}
          selectedTags={tags}
          sort={sort}
          initialItems={cards}
          initialHasMore={hasMore}
          grandTotal={grandTotal}
          filteredTotal={total}
          isFiltered={isFiltered}
          loggedIn={!!session}
        />
      </div>
    </>
  );
}

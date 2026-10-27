import { prisma } from "@/lib/prisma";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { buildLyricsWhere, buildLyricsOrderBy, parseLyricsSort, LYRICS_PAGE_SIZE } from "@/lib/lyrics-search";
import { getCurrentUser } from "@/lib/session";
import { getFavoritedLyricsIds } from "@/lib/favorites";
import { getTagCounts } from "@/lib/tags";
import { HomeScreen } from "@/components/HomeScreen";
import { HomeDesktopList } from "@/components/HomeDesktopList";
import { headers } from "next/headers";
import { isShellRequest } from "@/lib/offline";
import type { LyricsFeedItem } from "@/lib/use-lyrics-feed";
import type { TagCount } from "@/lib/tags";
import type { HomeFilters } from "@/lib/use-home-filters";

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
  const sort = parseLyricsSort(sortParam, "title_asc");

  const initialFilters = { query: q, tags, sort };

  // هيكل للقراءة دون اتصال: الواجهة نفسها بلا بيانات، تملؤها بيانات الجهاز.
  if (isShellRequest(await headers())) {
    const session = await getCurrentUser();
    return <HomeView shell initialFilters={initialFilters} cards={[]} hasMore={false} total={0} grandTotal={0} tagCounts={[]} loggedIn={!!session} />;
  }

  const where = buildLyricsWhere(q, tags);
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
    <HomeView
      initialFilters={initialFilters}
      cards={cards}
      hasMore={hasMore}
      total={total}
      grandTotal={grandTotal}
      tagCounts={tagCounts}
      loggedIn={!!session}
    />
  );
}

function HomeView({
  shell = false,
  initialFilters,
  cards,
  hasMore,
  total,
  grandTotal,
  tagCounts,
  loggedIn,
}: {
  shell?: boolean;
  initialFilters: HomeFilters;
  cards: LyricsFeedItem[];
  hasMore: boolean;
  total: number;
  grandTotal: number;
  tagCounts: TagCount[];
  loggedIn: boolean;
}) {
  return (
    <>
      <div className="sm:hidden">
        <HomeScreen
          initialFilters={initialFilters}
          initialItems={cards}
          initialHasMore={hasMore}
          initialTotal={total}
          grandTotal={grandTotal}
          tagCounts={tagCounts}
          loggedIn={loggedIn}
          shell={shell}
        />
      </div>

      <div className="hidden sm:block">
        <HomeDesktopList
          initialFilters={initialFilters}
          initialItems={cards}
          initialHasMore={hasMore}
          initialTotal={total}
          grandTotal={grandTotal}
          loggedIn={loggedIn}
          shell={shell}
        />
      </div>
    </>
  );
}

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildLyricsWhere } from "@/lib/lyrics-search";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { FavoritesScreen } from "@/components/FavoritesScreen";
import { FavoritesView } from "@/components/FavoritesView";
import type { FavoritesSsrData } from "@/hooks/use-offline-favorites";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

const SORTS = {
  recent: { label: "الأحدث", orderBy: { createdAt: "desc" } },
  oldest: { label: "الأقدم", orderBy: { createdAt: "asc" } },
  title: { label: "العنوان", orderBy: { lyrics: { title: "asc" } } },
  artist: { label: "المنشد", orderBy: { lyrics: { artist: "asc" } } },
  custom: { label: "ترتيبي الخاص", orderBy: { position: "asc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.FavoriteOrderByWithRelationInput }>;

type SortKey = keyof typeof SORTS;

const SORT_OPTIONS = (Object.keys(SORTS) as SortKey[]).map((value) => ({ value, label: SORTS[value].label }));

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/favorites");

  const { q = "", page: pageParam, sort: sortParam } = await searchParams;
  const query = q.trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "recent";
  const isCustom = sort === "custom";

  // Reuse the home page's Arabic-normalized search against the lyrics' shadow
  // `searchText` column, applied through the favorite → lyrics relation.
  const lyricsWhere = buildLyricsWhere(query, []);
  const where: Prisma.FavoriteWhereInput = {
    userId: session.userId,
    ...(Object.keys(lyricsWhere).length ? { lyrics: lyricsWhere } : {}),
  };

  // العدّاد بجانب العنوان في شاشة الموبايل — إجمالي المفضّلة بلا تصفية.
  const totalCount = await prisma.favorite.count({ where: { userId: session.userId } });

  // ── Custom order: a single-column reorderable list (no pagination). ──────────
  if (isCustom) {
    const rows = await prisma.favorite.findMany({
      where,
      orderBy: SORTS.custom.orderBy,
      select: {
        lyrics: { select: { id: true, title: true, artist: true, album: true } },
      },
    });

    // Reordering is only meaningful over the full, unfiltered list.
    const reorderable = query.length === 0;

    const ssr: FavoritesSsrData = {
      totalCount,
      query,
      sort,
      sortOptions: SORT_OPTIONS,
      isCustom: true,
      reorderable,
      items: rows.map((r) => ({
        lyricsId: r.lyrics.id,
        title: r.lyrics.title,
        artist: r.lyrics.artist,
        album: r.lyrics.album,
      })),
      page: 1,
      pageCount: 1,
    };

    return (
      <>
        <div className="sm:hidden">
          <FavoritesScreen ssr={ssr} />
        </div>
        <FavoritesView ssr={ssr} />
      </>
    );
  }

  // ── Field sorts: searchable, paginated card grid. ───────────────────────────
  const [rows, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        lyrics: {
          select: { id: true, title: true, artist: true, album: true, tags: true, createdAt: true, content: true },
        },
      },
    }),
    prisma.favorite.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ssr: FavoritesSsrData = {
    totalCount,
    query,
    sort,
    sortOptions: SORT_OPTIONS,
    isCustom: false,
    reorderable: false,
    items: rows.map((r) => ({
      lyricsId: r.lyrics.id,
      title: r.lyrics.title,
      artist: r.lyrics.artist,
      album: r.lyrics.album,
      tags: r.lyrics.tags,
      createdAt: r.lyrics.createdAt.toISOString(),
      contentHtml: renderLyricsHtml(r.lyrics.content),
    })),
    page,
    pageCount,
  };

  return (
    <>
      <div className="sm:hidden">
        <FavoritesScreen ssr={ssr} />
      </div>
      <FavoritesView ssr={ssr} />
    </>
  );
}

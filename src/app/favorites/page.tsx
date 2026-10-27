import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildLyricsWhere } from "@/lib/lyrics-search";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { isShellRequest } from "@/lib/offline";
import { FAVORITES_PAGE_SIZE, parseFavoritesParams, type FavoritesSortKey } from "@/lib/favorites-sorts";
import { FavoritesPage as FavoritesPageView } from "@/components/FavoritesPage";

export const dynamic = "force-dynamic";

const ORDER_BY = {
  recent: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  title: { lyrics: { title: "asc" } },
  artist: { lyrics: { artist: "asc" } },
  custom: { position: "asc" },
} satisfies Record<FavoritesSortKey, Prisma.FavoriteOrderByWithRelationInput>;

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/favorites");

  // هيكل للقراءة دون اتصال: الواجهة نفسها بلا بيانات، تملؤها بيانات الجهاز.
  if (isShellRequest(await headers())) return <FavoritesPageView data={null} />;

  const params = parseFavoritesParams(await searchParams);
  const { query, sort, page } = params;

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
  if (sort === "custom") {
    const rows = await prisma.favorite.findMany({
      where,
      orderBy: ORDER_BY.custom,
      select: { lyrics: { select: { id: true, title: true, artist: true, album: true } } },
    });
    return (
      <FavoritesPageView
        data={{
          params,
          totalCount,
          pageCount: 1,
          rows: rows.map((r) => ({ lyricsId: r.lyrics.id, title: r.lyrics.title, artist: r.lyrics.artist, album: r.lyrics.album })),
          cards: [],
        }}
      />
    );
  }

  // ── Field sorts: searchable, paginated card grid. ───────────────────────────
  const [rows, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * FAVORITES_PAGE_SIZE,
      take: FAVORITES_PAGE_SIZE,
      select: {
        lyrics: {
          select: { id: true, title: true, artist: true, album: true, tags: true, createdAt: true, content: true },
        },
      },
    }),
    prisma.favorite.count({ where }),
  ]);

  return (
    <FavoritesPageView
      data={{
        params,
        totalCount,
        pageCount: Math.max(1, Math.ceil(total / FAVORITES_PAGE_SIZE)),
        rows: rows.map((r) => ({ lyricsId: r.lyrics.id, title: r.lyrics.title, artist: r.lyrics.artist, album: r.lyrics.album })),
        cards: rows.map((r) => ({
          id: r.lyrics.id,
          title: r.lyrics.title,
          artist: r.lyrics.artist,
          album: r.lyrics.album,
          tags: r.lyrics.tags,
          createdAt: r.lyrics.createdAt.toISOString(),
          contentHtml: renderLyricsHtml(r.lyrics.content),
        })),
      }}
    />
  );
}

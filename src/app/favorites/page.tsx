import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildLyricsWhere } from "@/lib/lyrics-search";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { LyricsCard } from "@/components/LyricsCard";
import { FavoritesSearchBar } from "@/components/FavoritesSearchBar";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Pagination } from "@/components/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/favorites");

  const { q = "", page: pageParam } = await searchParams;
  const query = q.trim();
  const page = Math.max(1, Number(pageParam) || 1);

  // Reuse the home page's Arabic-normalized search against the lyrics' shadow
  // `searchText` column, applied through the favorite → lyrics relation.
  const lyricsWhere = buildLyricsWhere(query, []);
  const where: Prisma.FavoriteWhereInput = {
    userId: session.userId,
    ...(Object.keys(lyricsWhere).length ? { lyrics: lyricsWhere } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

  const cards = rows.map((r) => ({ ...r.lyrics, contentHtml: renderLyricsHtml(r.lyrics.content) }));
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/favorites?${qs}` : "/favorites";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">المفضلة</h1>
        <p className="mt-1 text-sm text-neutral-500">الأناشيد التي أضفتها إلى مفضّلتك.</p>
      </div>

      <FavoritesSearchBar defaultValue={query} />

      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          {query ? "لا توجد أناشيد مطابقة لبحثك في مفضّلتك" : "لا توجد أناشيد في مفضّلتك بعد. أضف أناشيد إليها من صفحة الأنشودة."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => (
            <LyricsCard
              key={item.id}
              id={item.id}
              title={item.title}
              artist={item.artist}
              album={item.album}
              tags={item.tags}
              createdAt={item.createdAt}
              contentHtml={item.contentHtml}
              action={<FavoriteButton lyricsId={item.id} initialFavorited variant="icon" refreshOnToggle />}
            />
          ))}
        </ul>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={pageHref} />
    </div>
  );
}

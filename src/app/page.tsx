import { prisma } from "@/lib/prisma";
import { renderLyricsHtml } from "@/lib/render-lyrics";
import { SearchBar } from "@/components/SearchBar";
import { TagFilterBar } from "@/components/TagFilterBar";
import { LyricsCard } from "@/components/LyricsCard";
import { Pagination } from "@/components/Pagination";

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

  const where = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { artist: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(tags.length ? { tags: { hasSome: tags } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.lyrics.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, artist: true, album: true, tags: true, createdAt: true, content: true },
    }),
    prisma.lyrics.count({ where }),
  ]);

  const cards = items.map((item) => ({ ...item, contentHtml: renderLyricsHtml(item.content) }));

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function queryString(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tags.length) params.set("tags", tags.join(","));
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    return params.toString();
  }

  return (
    <div className="flex flex-col gap-6">
      <SearchBar defaultValue={q} tags={tags} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700">تصفية حسب الوسوم</span>
        <TagFilterBar selected={tags} q={q} />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          {q || tags.length ? "لا توجد نتائج مطابقة لبحثك" : "لا توجد كلمات أغاني بعد"}
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
            />
          ))}
        </ul>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => `/?${queryString({ page: String(p) })}`} />
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SearchBar } from "@/components/SearchBar";
import { TagFilterBar } from "@/components/TagFilterBar";

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
      select: { id: true, title: true, artist: true, album: true, tags: true, createdAt: true },
    }),
    prisma.lyrics.count({ where }),
  ]);

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
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Link href={`/lyrics/${item.id}`} className="block">
                <h2 className="truncate text-lg font-bold text-neutral-900">{item.title}</h2>
                {item.artist && <p className="truncate text-sm text-emerald-700">{item.artist}</p>}
                {item.album && <p className="truncate text-xs text-neutral-400">{item.album}</p>}
              </Link>
              {item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/?tags=${encodeURIComponent(t)}`}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/?${queryString({ page: String(p) })}`}
              className={`rounded-md px-3 py-1.5 ${
                p === page
                  ? "bg-emerald-700 text-white"
                  : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

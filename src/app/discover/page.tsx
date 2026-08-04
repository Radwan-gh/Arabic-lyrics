import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PlaylistSearchBar } from "@/components/PlaylistSearchBar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page: pageParam } = await searchParams;
  const query = q.trim();
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.PlaylistWhereInput = {
    isPublic: true,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.playlist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        title: true,
        description: true,
        shareToken: true,
        createdAt: true,
        owner: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.playlist.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/discover?${qs}` : "/discover";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">الوصلات العامة</h1>
        <p className="mt-1 text-sm text-neutral-500">ابحث في وصلات الأناشيد التي شاركها المستخدمون علناً.</p>
      </div>

      <PlaylistSearchBar defaultValue={query} />

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
          {query ? "لا توجد وصلات عامة مطابقة لبحثك" : "لا توجد وصلات عامة بعد"}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li
              key={p.shareToken}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Link href={`/p/${p.shareToken}`} className="block">
                <h2 className="truncate text-lg font-bold text-neutral-900">{p.title}</h2>
                {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{p.description}</p>}
              </Link>
              <p className="mt-2 text-xs text-neutral-400">
                {p.owner?.name ?? "مستخدم"} · {p._count.items} نشيد · {formatDate(p.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
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

import Link from "next/link";
import { focusRing } from "@/lib/ui";

/**
 * Accessible, windowed pagination. Shows first/last, a window around the
 * current page, ellipses, and prev/next controls. RTL-aware: "previous" points
 * right (→), "next" points left (←).
 */
export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  const pages = pageWindow(page, pageCount);
  const cell =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm transition-colors " + focusRing;

  return (
    <nav aria-label="ترقيم الصفحات" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" aria-label="الصفحة السابقة" className={`${cell} border border-neutral-200 text-neutral-600 hover:bg-neutral-100`}>
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <span aria-hidden className={`${cell} border border-neutral-100 text-neutral-300`}>→</span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-neutral-400" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-label={`الصفحة ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={
              p === page
                ? `${cell} bg-emerald-700 font-semibold text-white`
                : `${cell} border border-neutral-200 text-neutral-600 hover:bg-neutral-100`
            }
          >
            {p}
          </Link>
        )
      )}

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" aria-label="الصفحة التالية" className={`${cell} border border-neutral-200 text-neutral-600 hover:bg-neutral-100`}>
          <span aria-hidden>←</span>
        </Link>
      ) : (
        <span aria-hidden className={`${cell} border border-neutral-100 text-neutral-300`}>←</span>
      )}
    </nav>
  );
}

/** Build a compact page list: 1 … (p-1) p (p+1) … last. */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const add = (p: number) => out.push(p);

  const first = 1;
  const last = pageCount;
  const start = Math.max(first, page - 1);
  const end = Math.min(last, page + 1);

  add(first);
  if (start > first + 1) out.push("…");
  for (let p = Math.max(first + 1, start); p <= Math.min(last - 1, end); p++) add(p);
  if (end < last - 1) out.push("…");
  if (last > first) add(last);

  return out;
}

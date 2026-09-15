import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { focusRing } from "@/lib/ui";

/**
 * Accessible, windowed pagination. Shows first/last, a window around the
 * current page, ellipses, and prev/next controls. RTL-aware: "previous" points
 * right (chevron-right), "next" points left (chevron-left).
 */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  /** عند تمريرها، تُعرَض أزرار تستدعيها بدل روابط تنقّل — وضع مُتحكَّم به يلزم
   * للقراءة دون اتصال، حيث لا يمكن جلب صفحة جديدة من الخادم. */
  onPageChange?: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const pages = pageWindow(page, pageCount);
  const cell =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm transition-colors " + focusRing;
  const disabledCell = `${cell} border border-neutral-100 text-neutral-300`;

  function PageLink({ p, children, ariaLabel, ariaCurrent, rel }: {
    p: number;
    children: React.ReactNode;
    ariaLabel: string;
    ariaCurrent?: "page";
    rel?: string;
  }) {
    const cls =
      ariaCurrent === "page"
        ? `${cell} bg-emerald-700 font-semibold text-white`
        : `${cell} border border-neutral-200 text-neutral-600 hover:bg-neutral-100`;
    if (onPageChange) {
      return (
        <button type="button" onClick={() => onPageChange(p)} aria-label={ariaLabel} aria-current={ariaCurrent} className={cls}>
          {children}
        </button>
      );
    }
    return (
      <Link href={hrefFor(p)} rel={rel} aria-label={ariaLabel} aria-current={ariaCurrent} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <nav aria-label="ترقيم الصفحات" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <PageLink p={page - 1} ariaLabel="الصفحة السابقة" rel="prev">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PageLink>
      ) : (
        <span aria-hidden className={disabledCell}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-neutral-400" aria-hidden>
            …
          </span>
        ) : (
          <PageLink key={p} p={p} ariaLabel={`الصفحة ${p}`} ariaCurrent={p === page ? "page" : undefined}>
            {p}
          </PageLink>
        )
      )}

      {page < pageCount ? (
        <PageLink p={page + 1} ariaLabel="الصفحة التالية" rel="next">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageLink>
      ) : (
        <span aria-hidden className={disabledCell}>
          <ChevronLeft className="h-4 w-4" />
        </span>
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

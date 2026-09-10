"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { MenuButton } from "@/components/MenuButton";
import { focusRing } from "@/lib/ui";

export interface DiscoverRow {
  token: string;
  title: string;
  ownerName: string;
  itemCount: number;
  previewTitles: string[];
}

interface DiscoverScreenProps {
  query: string;
  items: DiscoverRow[];
  page: number;
  pageCount: number;
  pageHref: (page: number) => string;
}

/** شاشة «الوصلات العامة» الغامرة على الموبايل: بحث دائم + بطاقات معاينة (اسم
 * المُعِدّ، عدد الأناشيد، وأول عناوينها). سطح المكتب يبقى على شبكة البطاقات الحالية. */
export function DiscoverScreen({ query, items, page, pageCount, pageHref }: DiscoverScreenProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const qs = params.toString();
    router.push(qs ? `/discover?${qs}` : "/discover");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center gap-2 px-3 pb-2 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="رجوع" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
          <ChevronRight className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="text-xl font-extrabold">الوصلات العامة</span>
        <div className="flex-1" />
        <MenuButton />
      </header>

      <form onSubmit={submitSearch} className="px-5 pb-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-[14px] my-auto h-5 w-5 text-[#9aa39d]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الوصلات العامة..."
            aria-label="ابحث في الوصلات العامة"
            className="h-12 w-full rounded-2xl border border-[#e6e6e1] bg-white ps-[44px] pe-3.5 text-base text-[#14211c] placeholder:text-[#9aa39d] focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </form>

      <div className="flex-1 px-5 pb-6">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#d9d9d3] p-8 text-center text-sm text-[#6b7670]">
            {query ? "لا توجد وصلات عامة مطابقة لبحثك" : "لا توجد وصلات عامة بعد"}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((p) => (
              <li key={p.token}>
                <Link href={`/p/${p.token}`} className={`block rounded-2xl border border-[#e6e6e1] bg-white p-4 ${focusRing}`}>
                  <div className="text-lg font-bold">{p.title}</div>
                  <div className="mt-0.5 text-sm text-[#6b7670]">
                    أعدّها {p.ownerName} · {p.itemCount.toLocaleString("ar-EG")} نشيداً
                  </div>
                  {p.previewTitles.length > 0 && (
                    <div className="mt-2.5 text-sm leading-[1.9] text-[#5c6660]">{p.previewTitles.join(" · ")} …</div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pageCount > 1 && (
        <div className="px-4 pb-6">
          <Pagination page={page} pageCount={pageCount} hrefFor={pageHref} />
        </div>
      )}
    </div>
  );
}

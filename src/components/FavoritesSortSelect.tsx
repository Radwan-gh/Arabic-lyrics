"use client";

import { useRouter } from "next/navigation";
import { inputSm, focusRing } from "@/lib/ui";

interface Option {
  value: string;
  label: string;
}

/** Sort control for the favorites page. Changing it resets to page 1 and keeps
 * the current search query. */
export function FavoritesSortSelect({
  value,
  query,
  options,
}: {
  value: string;
  query: string;
  options: Option[];
}) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (e.target.value) params.set("sort", e.target.value);
    const qs = params.toString();
    router.push(qs ? `/favorites?${qs}` : "/favorites");
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-neutral-600 ${focusRing}`}>
      <span className="shrink-0">الترتيب</span>
      <select value={value} onChange={onChange} aria-label="ترتيب المفضلة" className={`${inputSm} w-auto`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

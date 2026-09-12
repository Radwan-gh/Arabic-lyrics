"use client";

import { useRouter } from "next/navigation";
import { TagPicker } from "./TagPicker";

export function TagFilterBar({ selected, q, sort }: { selected: string[]; q: string; sort?: string }) {
  const router = useRouter();

  function handleChange(tags: string[]) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tags.length) params.set("tags", tags.join(","));
    if (sort) params.set("sort", sort);
    router.push(`/?${params.toString()}`);
  }

  return <TagPicker value={selected} onChange={handleChange} placeholder="تصفية حسب الوسوم..." />;
}

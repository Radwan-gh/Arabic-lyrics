"use client";

import { useRouter } from "next/navigation";
import { TagPicker } from "./TagPicker";

export function TagFilterBar({ selected, q }: { selected: string[]; q: string }) {
  const router = useRouter();

  function handleChange(tags: string[]) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tags.length) params.set("tags", tags.join(","));
    router.push(`/?${params.toString()}`);
  }

  return <TagPicker value={selected} onChange={handleChange} placeholder="تصفية حسب الوسوم..." />;
}

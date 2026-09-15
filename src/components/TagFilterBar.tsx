"use client";

import { useRouter } from "next/navigation";
import { TagPicker } from "./TagPicker";

export function TagFilterBar({
  selected,
  q,
  onChange,
}: {
  selected: string[];
  q: string;
  /** عند تمريرها، تُستدعى بدل التنقّل عبر الموجّه (وضع مُتحكَّم به — للقراءة دون اتصال). */
  onChange?: (tags: string[]) => void;
}) {
  const router = useRouter();

  function handleChange(tags: string[]) {
    if (onChange) {
      onChange(tags);
      return;
    }
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tags.length) params.set("tags", tags.join(","));
    router.push(`/?${params.toString()}`);
  }

  return <TagPicker value={selected} onChange={handleChange} placeholder="تصفية حسب الوسوم..." />;
}

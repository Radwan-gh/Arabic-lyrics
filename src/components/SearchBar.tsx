"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputCls, btnPrimary } from "@/lib/ui";

export function SearchBar({ defaultValue, tags }: { defaultValue: string; tags?: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    if (tags?.length) params.set("tags", tags.join(","));
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ابحث في العنوان أو الفنان أو كلمات النشيد..."
        aria-label="ابحث في العنوان أو الفنان أو كلمات النشيد"
        className={inputCls}
      />
      <button type="submit" className={`${btnPrimary} shrink-0`}>
        بحث
      </button>
    </form>
  );
}

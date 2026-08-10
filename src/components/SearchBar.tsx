"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
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
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-neutral-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ابحث في العنوان أو الفنان أو الأنشودة..."
          aria-label="ابحث في العنوان أو الفنان أو الأنشودة"
          className={`${inputCls} ps-10`}
        />
      </div>
      <button type="submit" className={`${btnPrimary} shrink-0`}>
        بحث
      </button>
    </form>
  );
}

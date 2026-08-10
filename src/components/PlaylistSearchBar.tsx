"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { inputCls, btnPrimary } from "@/lib/ui";

export function PlaylistSearchBar({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    const qs = params.toString();
    router.push(qs ? `/discover?${qs}` : "/discover");
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
          placeholder="ابحث في الوصلات العامة بالاسم أو الوصف..."
          aria-label="ابحث في الوصلات العامة"
          className={`${inputCls} ps-10`}
        />
      </div>
      <button type="submit" className={`${btnPrimary} shrink-0`}>
        بحث
      </button>
    </form>
  );
}

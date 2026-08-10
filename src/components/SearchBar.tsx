"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { inputCls, btnPrimary } from "@/lib/ui";

export function SearchBar({ defaultValue, tags }: { defaultValue: string; tags?: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function runSearch(nextValue: string) {
    const params = new URLSearchParams();
    if (nextValue.trim()) params.set("q", nextValue.trim());
    if (tags?.length) params.set("tags", tags.join(","));
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : "/");
    });
  }

  // Live search: update results automatically a short moment after typing stops.
  useEffect(() => {
    // Skip when the current value already matches the URL (initial mount, or
    // arriving via a URL that already carries `q`) to avoid a redundant nav.
    if (value.trim() === defaultValue.trim()) return;
    const timer = setTimeout(() => runSearch(value), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, defaultValue, tags]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(value);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ابحث في العنوان أو الفنان أو الأنشودة..."
        aria-label="ابحث في العنوان أو الفنان أو الأنشودة"
        className={inputCls}
      />
      <button type="submit" className={`${btnPrimary} shrink-0`}>
        بحث
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { inputCls, btnPrimary, focusRing } from "@/lib/ui";

export function SearchBar({ defaultValue, tags, sort }: { defaultValue: string; tags?: string[]; sort?: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // The last `q` this field itself sent to the URL, to tell the server answering
  // its own search apart from `q` changing for some other reason (see below).
  const sentValueRef = useRef<string | null>(null);

  function runSearch(nextValue: string) {
    const trimmed = nextValue.trim();
    sentValueRef.current = trimmed;
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (tags?.length) params.set("tags", tags.join(","));
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/?${qs}` : "/");
    });
  }

  // Stay in sync when `q` changes from outside this field — e.g. the mobile
  // search screen, mounted alongside this one and merely CSS-hidden, running
  // its own live search. Without this, this field's untouched local value
  // goes stale, and the effect below (seeing it no longer match the new `q`)
  // "corrects" the URL back to it a moment later, silently wiping out a
  // search made elsewhere.
  // A `q` this field sent itself, though, is just the server answering its own
  // search, which can land while the user is still typing. Resetting the field
  // to it then would erase whatever was typed after the request went out, so
  // leave the field alone (the effect below sends the newer text in turn).
  useEffect(() => {
    if (defaultValue === sentValueRef.current) return;
    sentValueRef.current = null;
    setValue(defaultValue);
  }, [defaultValue]);

  // Live search: update results automatically a short moment after typing stops.
  // `defaultValue` is deliberately left out of the deps below — see the sync
  // effect above, which keeps `value` matching it whenever it changes for a
  // reason other than this field's own typing.
  useEffect(() => {
    // Skip when the current value already matches the URL (initial mount, or
    // arriving via a URL that already carries `q`) to avoid a redundant nav.
    if (value.trim() === defaultValue.trim()) return;
    const timer = setTimeout(() => runSearch(value), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, tags, sort]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(value);
  }

  function handleClear() {
    setValue("");
    // Keep focus on the field so the mobile keyboard stays open; results update
    // via the debounced live-search effect above without a jarring re-render.
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-neutral-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ابحث في العنوان أو الفنان أو الأنشودة..."
          aria-label="ابحث في العنوان أو الفنان أو الأنشودة"
          className={`${inputCls} ps-10 pe-10 [&::-webkit-search-cancel-button]:appearance-none`}
        />
        {value && (
          <button
            type="button"
            // Prevent the button from stealing focus from the input on press, so
            // clearing never dismisses the on-screen keyboard on mobile.
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label="مسح البحث"
            className={`absolute inset-y-0 end-2 my-auto flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 ${focusRing}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <button type="submit" className={`${btnPrimary} shrink-0`}>
        بحث
      </button>
    </form>
  );
}

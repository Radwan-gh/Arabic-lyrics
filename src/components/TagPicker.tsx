"use client";

import { useEffect, useRef, useState } from "react";

export function TagPicker({
  value,
  onChange,
  allowCreate = false,
  placeholder = "أضف وسماً...",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  allowCreate?: boolean;
  placeholder?: string;
}) {
  const [available, setAvailable] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : { tags: [] }))
      .then((data) => setAvailable(data.tags ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = input.trim().toLowerCase();
  const suggestions = available.filter((t) => t.toLowerCase().includes(query) && !value.includes(t)).slice(0, 8);

  function addTag(tag: string) {
    const clean = tag.trim();
    if (!clean || value.includes(clean)) return;
    onChange([...value, clean]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (allowCreate && input.trim()) {
        addTag(input.trim());
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-1.5 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-emerald-500 hover:text-emerald-800"
              aria-label={`إزالة ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[100px] flex-1 border-none px-1 py-1 text-sm focus:outline-none focus:ring-0"
        />
      </div>

      {open && (suggestions.length > 0 || (allowCreate && input.trim())) && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => addTag(tag)}
                className="block w-full px-3 py-2 text-start text-sm hover:bg-neutral-50"
              >
                #{tag}
              </button>
            </li>
          ))}
          {allowCreate && input.trim() && !available.includes(input.trim()) && (
            <li>
              <button
                type="button"
                onClick={() => addTag(input.trim())}
                className="block w-full px-3 py-2 text-start text-sm text-emerald-700 hover:bg-emerald-50"
              >
                إضافة وسم جديد: &quot;{input.trim()}&quot;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

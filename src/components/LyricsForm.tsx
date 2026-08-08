"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { TagPicker } from "./TagPicker";
import { toEditableHtml } from "@/lib/lyrics-content";
import { inputCls, btnPrimary } from "@/lib/ui";

type DuplicateMatch = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
};

const RichTextEditor = dynamic(() => import("./RichTextEditor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <div className="min-h-[12rem] rounded-lg border border-neutral-300 bg-neutral-50" />,
});

interface LyricsFormValues {
  title: string;
  artist: string;
  album: string;
  content: string;
  tags: string[];
}

export function LyricsForm({
  mode,
  lyricsId,
  initialValues,
}: {
  mode: "create" | "edit";
  lyricsId?: string;
  initialValues?: Partial<LyricsFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<LyricsFormValues>({
    title: initialValues?.title ?? "",
    artist: initialValues?.artist ?? "",
    album: initialValues?.album ?? "",
    content: initialValues?.content ?? "",
    tags: initialValues?.tags ?? [],
  });
  const [initialContentHtml] = useState(() => toEditableHtml(initialValues?.content ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [suggestions, setSuggestions] = useState<DuplicateMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [checking, setChecking] = useState(false);

  // فحص فوري (debounced) أثناء كتابة العنوان: يجلب المطابقات التامة (لمنع التكرار)
  // والاقتراحات (أناشيد موجودة يحتوي نصّها الكامل على الكلمة المكتوبة) معاً.
  useEffect(() => {
    const title = values.title.trim();
    if (!title) {
      setDuplicates([]);
      setSuggestions([]);
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ title });
        if (mode === "edit" && lyricsId) params.set("excludeId", lyricsId);
        const res = await fetch(`/api/lyrics/check?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setDuplicates(Array.isArray(data.matches) ? data.matches : []);
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        // تجاهل أخطاء الإلغاء/الشبكة — الفحص النهائي على الخادم عند الحفظ.
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [values.title, mode, lyricsId]);

  async function submit(allowDuplicate: boolean) {
    setLoading(true);
    setError(null);

    const payload = {
      title: values.title,
      artist: values.artist,
      album: values.album,
      content: values.content,
      tags: values.tags,
      allowDuplicate,
    };

    const res = await fetch(mode === "create" ? "/api/lyrics" : `/api/lyrics/${lyricsId}`, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data.duplicates)) {
        setDuplicates(data.duplicates);
      }
      setError(data.error || "حدث خطأ ما");
      return;
    }

    const saved = await res.json();
    router.push(`/lyrics/${saved.id ?? lyricsId}`);
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // زر الحفظ الأساسي لا يتجاوز التكرار؛ التجاوز يتم عبر زر التأكيد المنفصل.
    void submit(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        <label htmlFor="lyrics-title">عنوان الأغنية</label>
        <div className="relative">
          <input
            id="lyrics-title"
            required
            autoComplete="off"
            value={values.title}
            onChange={(e) => {
              setValues({ ...values, title: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSuggestions(false);
            }}
            className={inputCls}
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="title-suggestions"
            aria-describedby={duplicates.length ? "duplicate-warning" : undefined}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              id="title-suggestions"
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
            >
              <li className="px-3 py-1 text-xs font-normal text-neutral-400">أناشيد موجودة قد تطابق بحثك</li>
              {suggestions.map((s) => (
                <li key={s.id} role="option" aria-selected={false}>
                  <Link
                    href={`/lyrics/${s.id}`}
                    target="_blank"
                    className="flex flex-col gap-0.5 px-3 py-2 transition-colors hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
                  >
                    <span className="font-medium text-neutral-900">{s.title}</span>
                    {(s.artist || s.album) && (
                      <span className="text-xs font-normal text-neutral-500">
                        {[s.artist, s.album].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {checking && <span className="text-xs font-normal text-neutral-400">جارٍ التحقق من التكرار…</span>}
      </div>

      {duplicates.length > 0 && (
        <div
          id="duplicate-warning"
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-semibold">⚠️ يوجد نشيد بنفس العنوان مسبقاً</p>
          <p className="mt-1 text-amber-800">
            تحقّق من القائمة أدناه قبل الإضافة لتجنّب التكرار:
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/lyrics/${d.id}`}
                  target="_blank"
                  className="font-medium text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
                >
                  {d.title}
                </Link>
                {(d.artist || d.album) && (
                  <span className="text-amber-700">
                    {" — "}
                    {[d.artist, d.album].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field label="الفنان (اختياري)">
        <input
          value={values.artist}
          onChange={(e) => setValues({ ...values, artist: e.target.value })}
          className={inputCls}
        />
      </Field>

      <Field label="الألبوم (اختياري)">
        <input
          value={values.album}
          onChange={(e) => setValues({ ...values, album: e.target.value })}
          className={inputCls}
        />
      </Field>

      <Field label="الكلمات">
        <RichTextEditor
          content={initialContentHtml}
          onChange={(html) => setValues((v) => ({ ...v, content: html }))}
        />
      </Field>

      <Field label="وسوم (اختياري)">
        <TagPicker
          value={values.tags}
          onChange={(tags) => setValues({ ...values, tags })}
          allowCreate
          placeholder="اكتب لإضافة وسم جديد أو اختر من الموجود..."
        />
      </Field>

      {duplicates.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جارٍ الحفظ..." : mode === "create" ? "نشر رغم وجود المشابه" : "حفظ رغم وجود المشابه"}
          </button>
        </div>
      ) : (
        <button type="submit" disabled={loading} className={`${btnPrimary} mt-2`}>
          {loading ? "جارٍ الحفظ..." : mode === "create" ? "نشر الكلمات" : "حفظ التعديلات"}
        </button>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {children}
    </label>
  );
}

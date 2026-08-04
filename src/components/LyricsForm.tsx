"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { TagPicker } from "./TagPicker";
import { toEditableHtml } from "@/lib/lyrics-content";
import { inputCls, btnPrimary } from "@/lib/ui";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title: values.title,
      artist: values.artist,
      album: values.album,
      content: values.content,
      tags: values.tags,
    };

    const res = await fetch(mode === "create" ? "/api/lyrics" : `/api/lyrics/${lyricsId}`, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "حدث خطأ ما");
      return;
    }

    const saved = await res.json();
    router.push(`/lyrics/${saved.id ?? lyricsId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Field label="عنوان الأغنية">
        <input
          required
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          className={inputCls}
        />
      </Field>

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

      <button type="submit" disabled={loading} className={`${btnPrimary} mt-2`}>
        {loading ? "جارٍ الحفظ..." : mode === "create" ? "نشر الكلمات" : "حفظ التعديلات"}
      </button>
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

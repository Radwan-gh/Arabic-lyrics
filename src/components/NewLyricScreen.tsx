"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { X, TriangleAlert } from "lucide-react";
import { TagPicker } from "./TagPicker";
import type { useLyricsForm } from "@/lib/use-lyrics-form";
import { MenuButton } from "@/components/MenuButton";
import { focusRing } from "@/lib/ui";

const LyricsTextEditor = dynamic(() => import("./LyricsTextEditor").then((m) => m.LyricsTextEditor), {
  ssr: false,
  loading: () => <div className="min-h-[12rem] rounded-2xl border border-[#e6e6e1] bg-white" />,
});

const fieldInput =
  "h-[50px] w-full min-w-0 box-border rounded-2xl border border-[#e6e6e1] bg-white px-3.5 text-base text-[#14211c] placeholder:text-[#9aa39d] focus:outline-none focus:ring-2 focus:ring-emerald-100";

/** شاشة «أنشودة جديدة» الغامرة على الموبايل — نفس منطق LyricsForm (ممرَّر عبر
 * `form`)، بترويسة وتخطيط مطابقَين للتصميم. لا تُستخدم في وضع التعديل. */
export function NewLyricScreen({ form }: { form: ReturnType<typeof useLyricsForm> }) {
  const router = useRouter();
  const { values, setValues, error, loading, duplicates, submit } = form;

  function handleSave() {
    void submit(duplicates.length > 0);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f4] text-[#14211c]">
      <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => router.back()} aria-label="إلغاء" className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3c4a44] ${focusRing}`}>
            <X className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
          <span className="text-lg font-extrabold">أنشودة جديدة</span>
          <MenuButton />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-[18px] text-[15px] font-bold text-white disabled:opacity-60"
        >
          {loading ? "…" : "حفظ"}
        </button>
      </header>

      {error && (
        <p role="alert" className="mx-5 mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-8">
        <Field label="العنوان">
          <input
            required
            autoComplete="off"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
            className={fieldInput}
          />
          {duplicates.length > 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-[#fef3c7] p-2.5 text-[13px] leading-[1.7] text-[#92400e]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                يوجد نشيد بعنوان مطابق:{" "}
                <Link href={`/lyrics/${duplicates[0].id}`} target="_blank" className="font-bold underline">
                  {duplicates[0].title}
                  {duplicates[0].artist ? ` — ${duplicates[0].artist}` : ""}
                </Link>
                . يمكنك المتابعة إن كان إصداراً مختلفاً.
              </span>
            </div>
          )}
        </Field>

        <div className="flex gap-2.5">
          <div className="min-w-0 flex-1">
            <Field label="المنشد">
              <input value={values.artist} onChange={(e) => setValues({ ...values, artist: e.target.value })} className={fieldInput} />
            </Field>
          </div>
          <div className="min-w-0 flex-1">
            <Field label="الألبوم">
              <input
                value={values.album}
                onChange={(e) => setValues({ ...values, album: e.target.value })}
                placeholder="اختياري"
                className={fieldInput}
              />
            </Field>
          </div>
        </div>

        <Field label="الوسوم">
          <TagPicker
            value={values.tags}
            onChange={(tags) => setValues({ ...values, tags })}
            allowCreate
            placeholder="أضف وسماً..."
          />
        </Field>

        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-semibold text-[#3c4a44]">الكلمات</span>
          <LyricsTextEditor
            content={form.initialContentHtml}
            onChange={(html) => setValues((v) => ({ ...v, content: html }))}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#3c4a44]">
      {label}
      {children}
    </label>
  );
}

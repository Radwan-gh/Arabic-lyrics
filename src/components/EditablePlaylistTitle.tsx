"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { focusRing } from "@/lib/ui";

const MAX_TITLE = 120;

interface EditablePlaylistTitleProps {
  playlistId: string;
  title: string;
  /** يُستدعى بعد الحفظ الناجح بالعنوان الجديد. */
  onSaved: (title: string) => void;
  /** أصناف عنصر العنوان (h1) لتطابق تصميم الشاشة. */
  titleClassName: string;
  /** أصناف حقل الإدخال أثناء التعديل. */
  inputClassName: string;
}

/** عنوان الوصلة مع تعديل مباشر: زر القلم يحوّله إلى حقل؛ Enter يحفظ وEscape يلغي. */
export function EditablePlaylistTitle({ playlistId, title, onSaved, titleClassName, inputClassName }: EditablePlaylistTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function start() {
    setDraft(title);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
    requestAnimationFrame(() => editBtnRef.current?.focus());
  }

  async function save() {
    const next = draft.trim();
    if (!next) {
      setError("اسم الوصلة مطلوب");
      inputRef.current?.focus();
      return;
    }
    if (next === title) {
      cancel();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "تعذّر حفظ الاسم، حاول مجدداً");
        return;
      }
      onSaved(data?.playlist?.title ?? next);
      cancel();
    } catch {
      setError("تعذّر الاتصال، تحقّق من الشبكة وحاول مجدداً");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-1.5">
        <h1 className={`min-w-0 break-words ${titleClassName}`}>{title}</h1>
        <button
          ref={editBtnRef}
          type="button"
          onClick={start}
          aria-label="تعديل اسم الوصلة"
          title="تعديل اسم الوصلة"
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-700 ${focusRing}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={MAX_TITLE}
          disabled={saving}
          aria-label="اسم الوصلة"
          aria-invalid={!!error}
          aria-describedby={error ? `playlist-title-error-${playlistId}` : undefined}
          className={`min-w-0 flex-1 ${inputClassName}`}
        />
        <button
          type="submit"
          disabled={saving}
          aria-label="حفظ الاسم"
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 ${focusRing}`}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          aria-label="إلغاء التعديل"
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 ${focusRing}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p id={`playlist-title-error-${playlistId}`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

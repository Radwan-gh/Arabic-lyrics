"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { TagPickerPanel } from "./TagPickerPanel";
import { useQuickTags } from "@/lib/use-quick-tags";
import { focusRing } from "@/lib/ui";

type Variant = "card" | "detail" | "reader";

const chipCls: Record<Variant, string> = {
  card: "rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200",
  detail: "rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200",
  reader: "inline-flex h-[30px] items-center rounded-full border border-[#e6e6e1] bg-white px-3 text-[13px] text-[#5c6660]",
};

const addCls: Record<Variant, string> = {
  card: "h-[22px] px-2 text-[11px]",
  detail: "h-7 px-3 text-xs",
  // مساحة لمس مريحة على الموبايل (العنصر المرئي 30px داخل منطقة 44px).
  reader: "h-[30px] px-3 text-[13px] relative after:absolute after:-inset-y-[7px] after:inset-x-0 after:content-['']",
};

interface QuickTagEditorProps {
  lyricsId: string;
  tags: string[];
  canModify: boolean;
  variant: Variant;
  /** يُستدعى بعد كل حفظ ناجح بالوسوم كما أعادها الخادم. */
  onTagsChange?: (tags: string[]) => void;
  className?: string;
}

/**
 * صف وسوم النشيد مع تعديل سريع: كل وسم رابط للتصفية، ومن يملك التعديل يرى
 * شريحة «+ وسم» تفتح المنتقي (لوح منسدل على سطح المكتب، لوح سفلي في شاشة القراءة)
 * وزر × على الوسم لإزالته مباشرة (سطح المكتب). الحفظ فوري ومتفائل بلا زر «حفظ».
 */
export function QuickTagEditor({ lyricsId, tags: initialTags, canModify, variant, onTagsChange, className = "" }: QuickTagEditorProps) {
  const { tags, toggle, error, saving, clearError } = useQuickTags(lyricsId, initialTags, onTagsChange);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheet = variant === "reader";

  function close() {
    setOpen(false);
    clearError();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open || sheet) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        clearError();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheet]);

  if (!canModify && tags.length === 0) return null;

  const panel = (
    <TagPickerPanel selected={tags} onToggle={toggle} error={error} busy={saving} onClose={close} touch={sheet} />
  );

  return (
    <div ref={ref} className={`relative flex flex-wrap items-center gap-1.5 ${variant === "card" ? "" : "gap-2"} ${className}`}>
      {tags.map((tag) =>
        canModify && !sheet ? (
          <span key={tag} className={`group inline-flex items-center ${chipCls[variant]} !pe-1`}>
            <Link href={`/?tags=${encodeURIComponent(tag)}`} className={`rounded-full ${focusRing}`}>
              #{tag}
            </Link>
            <button
              type="button"
              onClick={() => toggle(tag)}
              aria-label={`إزالة الوسم ${tag}`}
              title="إزالة الوسم"
              className={`ms-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-300 hover:text-neutral-700 focus:opacity-100 group-hover:opacity-100 ${focusRing}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <Link key={tag} href={`/?tags=${encodeURIComponent(tag)}`} className={`${chipCls[variant]} ${focusRing}`}>
            #{tag}
          </Link>
        ),
      )}

      {canModify && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="إضافة وسم"
          title="إضافة وسم"
          className={`inline-flex items-center gap-1 rounded-full border border-dashed border-emerald-400 font-medium text-emerald-700 transition-colors hover:border-emerald-600 hover:bg-emerald-50 ${addCls[variant]} ${focusRing}`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          وسم
        </button>
      )}

      {!open && error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}

      {open && !sheet && (
        <div
          role="dialog"
          aria-label="إضافة وسوم"
          className="absolute start-0 top-full z-20 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg"
        >
          {panel}
        </div>
      )}

      {open && sheet && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="وسوم الأنشودة"
          // شاشة القراءة تتنقّل بين أناشيد الوصلة بالسحب: لا يصل السحب داخل اللوح إليها.
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <button type="button" aria-label="إغلاق" onClick={close} className="absolute inset-0 bg-[#14211c]/30" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-2.5 shadow-2xl">
            <span aria-hidden="true" className="mx-auto h-1.5 w-11 rounded-full bg-neutral-200" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold text-[#14211c]">وسوم الأنشودة</span>
              <button type="button" onClick={close} className={`rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 ${focusRing}`}>
                تم
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { TagPickerPanel } from "./TagPickerPanel";
import { TagSheet } from "./TagSheet";
import { useQuickTags } from "@/lib/use-quick-tags";
import { useOnline } from "@/lib/use-online";
import { focusRing } from "@/lib/ui";

type Variant = "card" | "detail" | "reader";

const chipCls: Record<Variant, string> = {
  card: "rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200",
  detail: "rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200",
  reader:
    "inline-flex h-[30px] items-center rounded-full border border-line bg-surface px-3 text-[13px] text-ink-3",
};

// شاشة القراءة بالمظهر الداكن (خلفية ‎#0e1613).
const readerDarkChipCls =
  "inline-flex h-[30px] items-center rounded-full border border-white/15 bg-white/[0.06] px-3 text-[13px] text-[#c9d3ce]";
const readerDarkAddCls = "border-emerald-400/60 text-emerald-300 hover:border-emerald-300 hover:bg-emerald-400/10";
const addToneCls = "border-emerald-400 text-accent hover:border-emerald-600 hover:bg-emerald-50";

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
  /** مظهر القراءة الداكن في شاشة القراءة: شرائح بخلفية داكنة بدل البيضاء. */
  dark?: boolean;
  className?: string;
}

/**
 * صف وسوم النشيد مع تعديل سريع: كل وسم رابط للتصفية، ومن يملك التعديل يرى
 * شريحة «+ وسم» تفتح المنتقي (لوح منسدل على سطح المكتب، لوح سفلي في شاشة القراءة)
 * وزر × على الوسم لإزالته مباشرة (سطح المكتب). الحفظ فوري ومتفائل بلا زر «حفظ».
 * دون اتصال تظهر الوسوم للقراءة فقط.
 */
export function QuickTagEditor({
  lyricsId,
  tags: initialTags,
  canModify: allowed,
  variant,
  onTagsChange,
  dark = false,
  className = "",
}: QuickTagEditorProps) {
  const { tags, toggle, error, saving, clearError } = useQuickTags(lyricsId, initialTags, onTagsChange);
  const [open, setOpen] = useState(false);
  // دون اتصال لا يمكن الحفظ: يُخفى زر الوسم وأزرار الإزالة، ويُغلق المنتقي إن كان مفتوحًا.
  const online = useOnline();
  const canModify = allowed && online;
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheet = variant === "reader";
  const chip = dark && sheet ? readerDarkChipCls : chipCls[variant];

  function close() {
    setOpen(false);
    clearError();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!online && open) {
      setOpen(false);
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => {
    if (!open || sheet) return;
    // Esc يغلق اللوح المنسدل حتى لو لم يكن التركيز في حقل البحث.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        close();
      }
    }
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        clearError();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheet]);

  if (!canModify && tags.length === 0) return null;

  const panel = (
    <TagPickerPanel
      selected={tags}
      onToggle={toggle}
      error={error}
      busy={saving}
      onClose={close}
      touch={sheet}
      dark={dark && sheet}
    />
  );

  return (
    <div
      ref={ref}
      className={`relative flex flex-wrap items-center gap-1.5 ${variant === "card" ? "" : "gap-2"} ${className}`}
    >
      {tags.map((tag) =>
        canModify && !sheet ? (
          <span key={tag} className={`group inline-flex items-center ${chip} !pe-1`}>
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
          <Link key={tag} href={`/?tags=${encodeURIComponent(tag)}`} className={`${chip} ${focusRing}`}>
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
          className={`inline-flex items-center gap-1 rounded-full border border-dashed font-medium transition-colors ${
            dark && sheet ? readerDarkAddCls : addToneCls
          } ${addCls[variant]} ${focusRing}`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          وسم
        </button>
      )}

      {!open && error && (
        <span role="alert" className={`text-xs ${dark && sheet ? "text-red-300" : "text-danger"}`}>
          {error}
        </span>
      )}

      {open && !sheet && (
        <div
          role="dialog"
          aria-label="إضافة وسوم"
          // ارتفاع ثابت: القائمة تُمرَّر داخله ولا يتغيّر حجم اللوح مع البحث.
          className="absolute start-0 top-full z-20 mt-1 flex h-[22rem] w-72 flex-col rounded-xl border border-neutral-200 bg-surface p-2 shadow-lg"
        >
          {panel}
        </div>
      )}

      {open && sheet && (
        <TagSheet title="وسوم الأنشودة" onClose={close} dark={dark}>
          {panel}
        </TagSheet>
      )}
    </div>
  );
}

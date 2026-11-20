"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Spinner } from "./Spinner";
import { useTagSuggestions } from "@/lib/use-tag-suggestions";
import { MAX_TAGS, MAX_TAG_LEN, cleanTag, hasTag, tagKey } from "@/lib/tag-rules";

/** عدد الاقتراحات الظاهرة في القائمة. */
const VISIBLE = 8;

/** ألوان المنتقي: الفاتح افتراضيًا، والداكن داخل شاشة القراءة بالمظهر الداكن. */
const TONES = {
  light: {
    input:
      "border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-emerald-100",
    icon: "text-neutral-400",
    active: "bg-emerald-50",
    box: "border-neutral-300",
    text: "text-neutral-800",
    create: "text-emerald-800",
    plus: "text-emerald-700",
    count: "text-neutral-400",
    muted: "text-neutral-500",
    hint: "text-neutral-400",
    error: "text-red-600",
    ok: "text-emerald-700",
    warn: "text-amber-700",
  },
  dark: {
    input:
      "border-white/15 bg-white/[0.06] text-[#f2f5f3] placeholder:text-[#7d8a84] focus:border-emerald-400 focus:ring-emerald-400/20",
    icon: "text-[#7d8a84]",
    active: "bg-white/[0.08]",
    box: "border-white/30",
    text: "text-[#e3e9e6]",
    create: "text-emerald-300",
    plus: "text-emerald-300",
    count: "text-[#7d8a84]",
    muted: "text-[#9aa8a1]",
    hint: "text-[#7d8a84]",
    error: "text-red-300",
    ok: "text-emerald-300",
    warn: "text-amber-300",
  },
};

interface Option {
  tag: string;
  count: number | null;
  checked: boolean;
  create: boolean;
}

interface TagPickerPanelProps {
  /** الوسوم المطبَّقة حاليًا (تظهر معلَّمة أعلى القائمة). */
  selected: string[];
  /** نقرة/Enter على وسم: إضافة أو إزالة (أو إنشاء وسم جديد). */
  onToggle: (tag: string) => void;
  /** في الوضع الجماعي الإضافة فقط: الوسم المعلَّم لا يُزال. */
  mode?: "single" | "bulk";
  error?: string | null;
  /** رسالة نجاح/حالة (الوضع الجماعي). */
  status?: string | null;
  busy?: boolean;
  onClose: () => void;
  /** ارتفاع أكبر للمس على الموبايل. */
  touch?: boolean;
  /** ألوان داكنة (لوح شاشة القراءة بالمظهر الداكن). */
  dark?: boolean;
}

/**
 * محتوى منتقي الوسوم السريع: حقل بحث يأخذ التركيز فورًا، والأكثر استخدامًا عند
 * الفراغ، وتصفية غير حساسة للتشكيل وصور الحروف، وخيار «إنشاء» عند عدم التطابق.
 * لوحة المفاتيح: ↑↓ للتنقّل، Enter للتبديل، Esc للإغلاق، Backspace في حقل فارغ
 * يزيل آخر وسم. يُغلَّف بلوح منسدل (سطح المكتب) أو لوح سفلي (الموبايل).
 */
export function TagPickerPanel({
  selected,
  onToggle,
  mode = "single",
  error,
  status,
  busy,
  onClose,
  touch,
  dark = false,
}: TagPickerPanelProps) {
  const t = TONES[dark ? "dark" : "light"];
  const suggestions = useTagSuggestions(true);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const full = mode === "single" && selected.length >= MAX_TAGS;

  const options = useMemo<Option[]>(() => {
    const counts = new Map((suggestions ?? []).map((s) => [tagKey(s.tag), s.count]));
    const cleaned = cleanTag(query);
    const key = tagKey(cleaned);

    const selectedOpts: Option[] = selected.map((tag) => ({
      tag,
      count: counts.get(tagKey(tag)) ?? null,
      checked: true,
      create: false,
    }));
    const others: Option[] = (suggestions ?? [])
      .filter((s) => !hasTag(selected, s.tag))
      .map((s) => ({ tag: s.tag, count: s.count, checked: false, create: false }));

    if (!key) return [...selectedOpts, ...others.slice(0, VISIBLE)];

    const matches = [...selectedOpts, ...others].filter((o) => tagKey(o.tag).includes(key));
    // التطابق التام أولاً ثم ما يبدأ بالنص ثم ما يحتويه.
    const rank = (o: Option) => (tagKey(o.tag) === key ? 0 : tagKey(o.tag).startsWith(key) ? 1 : 2);
    matches.sort((a, b) => rank(a) - rank(b));
    const list = matches.slice(0, VISIBLE);
    const exact = matches.some((o) => tagKey(o.tag) === key);
    if (!exact && cleaned.length <= MAX_TAG_LEN) {
      list.push({ tag: cleaned, count: null, checked: false, create: true });
    }
    return list;
  }, [suggestions, selected, query]);

  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  function choose(o: Option) {
    if (o.checked && mode === "bulk") return;
    if (!o.checked && full) return;
    onToggle(o.tag);
    if (!o.checked) setQuery("");
    setActive(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (options.length ? (Math.min(i, options.length - 1) + 1) % options.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (options.length ? (Math.min(i, options.length - 1) - 1 + options.length) % options.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[activeIndex];
      if (o) choose(o);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Backspace" && !query && mode === "single" && selected.length > 0) {
      onToggle(selected[selected.length - 1]);
    }
  }

  // سطر الحالة (خطأ/نتيجة/الحد/العدّاد): فوق القائمة على الموبايل ليبقى ظاهرًا مع لوحة المفاتيح.
  const footer = (
    <div className="flex min-h-5 items-center justify-between gap-2 px-1 text-xs" aria-live="polite">
      {error ? (
        <span role="alert" className={t.error}>
          {error}
        </span>
      ) : status ? (
        <span className={t.ok}>{status}</span>
      ) : full ? (
        <span className={t.warn}>وصلت إلى الحد الأقصى ({MAX_TAGS} وسوم)</span>
      ) : (
        <span className={t.hint}>Enter للإضافة · Esc للإغلاق</span>
      )}
      <span className={`flex shrink-0 items-center gap-2 ${t.muted}`}>
        {busy && <Spinner size={14} srLabel="جارٍ الحفظ…" />}
        {mode === "single" && selected.length >= MAX_TAGS - 3 && (
          <span>
            {selected.length} / {MAX_TAGS}
          </span>
        )}
      </span>
    </div>
  );

  const rowCls = touch ? "min-h-12 px-3 py-2.5 text-base" : "min-h-9 px-2.5 py-1.5 text-sm";

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className={`pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 ${t.icon}`}
          aria-hidden="true"
        />
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={options.length ? `${listId}-${activeIndex}` : undefined}
          aria-label="ابحث عن وسم أو اكتب وسمًا جديدًا"
          placeholder="ابحث أو اكتب وسمًا جديدًا"
          value={query}
          maxLength={MAX_TAG_LEN + 10}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className={`w-full rounded-lg border pe-3 ps-9 focus:outline-none focus:ring-2 ${t.input} ${
            touch ? "h-12 text-base" : "h-9 text-sm"
          }`}
        />
      </div>

      {touch && footer}

      {suggestions === null ? (
        <div className={`p-2 text-sm ${t.muted}`}>
          <Spinner label="جارٍ تحميل الوسوم…" />
        </div>
      ) : options.length === 0 ? (
        <p className={`px-1 py-2 text-sm ${t.muted}`}>لا توجد وسوم بعد. اكتب وسمًا جديدًا.</p>
      ) : (
        <ul id={listId} role="listbox" aria-multiselectable="true" aria-label="الوسوم" className="flex flex-col">
          {options.map((o, i) => {
            const disabled = (o.checked && mode === "bulk") || (!o.checked && full);
            return (
              <li
                key={(o.create ? "+" : "") + o.tag}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.checked}
                aria-disabled={disabled || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md ${rowCls} ${
                  i === activeIndex ? t.active : ""
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                {o.create ? (
                  <Plus className={`h-4 w-4 shrink-0 ${t.plus}`} aria-hidden="true" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded ${
                      o.checked ? "bg-emerald-700 text-white" : `border-[1.5px] ${t.box}`
                    }`}
                  >
                    {o.checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                )}
                <span className={`flex-1 truncate ${o.create ? `font-semibold ${t.create}` : t.text}`}>
                  {o.create ? `إنشاء «${o.tag}»` : o.tag}
                </span>
                {o.count !== null && !o.create && (
                  <span className={`shrink-0 text-xs ${t.count}`}>{o.count.toLocaleString("ar-EG")}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!touch && footer}
    </div>
  );
}

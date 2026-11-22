"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, ListOrdered, X } from "lucide-react";
import { LyricsProse } from "@/components/LyricsProse";
import { focusRing } from "@/lib/ui";
import { LINE_SPACING_DEFAULT, type LineSpacing } from "@/lib/lyrics-reading-prefs";

// `!` لتغلب leading-loose المضمّنة في نمط نص الأنشودة.
const LINE_SPACING_OVERRIDE: Record<LineSpacing, string> = {
  compact: "!leading-relaxed",
  comfortable: "!leading-loose",
  wide: "!leading-[2.5]",
};

export interface PlaylistBodyItem {
  lyricsId: string;
  title: string;
  artist: string | null;
  contentHtml: string;
}

const num = (n: number) => n.toLocaleString("ar-EG");
const sectionId = (lyricsId: string) => `nasheed-${lyricsId}`;

/**
 * جسم قراءة الوصلة: الأناشيد كاملةً تحت بعضها بالترتيب (قراءة متتالية بلا نقرات)،
 * ولكل نشيد طيّ/فتح بالضغط على عنوانه (مع «طيّ الكل/فتح الكل»)،
 * مع «فهرس عائم» أسفل الشاشة يُظهر النشيد الحالي وموضعه، وزرّي السابق/التالي، ويفتح
 * لوحًا بعناوين كل أناشيد الوصلة للقفز إلى أيٍّ منها. مشترك بين عرض المالك والرابط العام.
 */
export function PlaylistStackedBody({
  items,
  lineSpacing = LINE_SPACING_DEFAULT,
}: {
  items: PlaylistBodyItem[];
  lineSpacing?: LineSpacing;
}) {
  const [current, setCurrent] = useState(0);
  const [indexOpen, setIndexOpen] = useState(false);
  // الأناشيد المطويّة (تبدأ كلها مفتوحة للقراءة).
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const allCollapsed = items.length > 0 && collapsed.size >= items.length;

  function toggle(lyricsId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(lyricsId)) next.delete(lyricsId);
      else next.add(lyricsId);
      return next;
    });
  }
  // أثناء التمرير الناعم بعد القفز يبقى المؤشّر على الهدف بدل المرور بما بينهما.
  const lockUntil = useRef(0);

  // النشيد الحالي = آخر نشيد تجاوز عنوانُه ثلث الشاشة العلوي.
  useEffect(() => {
    if (items.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < lockUntil.current) return;
      const line = window.innerHeight * 0.35;
      let next = 0;
      for (let i = 0; i < items.length; i++) {
        const el = document.getElementById(sectionId(items[i].lyricsId));
        if (el && el.getBoundingClientRect().top <= line) next = i;
        else break;
      }
      // في نهاية الصفحة يُعدّ الأخير حاليًا وإن كان قصيرًا.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) next = items.length - 1;
      setCurrent(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  const jumpTo = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      setIndexOpen(false);
      setCurrent(index);
      // القفز إلى نشيد مطويّ يفتحه.
      setCollapsed((prev) => {
        if (!prev.has(item.lyricsId)) return prev;
        const next = new Set(prev);
        next.delete(item.lyricsId);
        return next;
      });
      lockUntil.current = Date.now() + 800;
      document.getElementById(sectionId(item.lyricsId))?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [items],
  );

  if (items.length === 0) {
    return (
      <p className="mx-4 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500 sm:mx-0">
        هذه الوصلة فارغة.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 pb-28 sm:gap-4">
        {items.length > 1 && (
          <div className="-mb-1 flex justify-end px-3 sm:-mb-2 sm:px-0">
            <button
              type="button"
              onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(items.map((i) => i.lyricsId)))}
              className={`inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-accent transition-colors hover:bg-ink/5 ${focusRing}`}
            >
              {allCollapsed ? (
                <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronsDownUp className="h-4 w-4" aria-hidden="true" />
              )}
              {allCollapsed ? "فتح الكل" : "طيّ الكل"}
            </button>
          </div>
        )}
        {items.map((item, index) => {
          const id = sectionId(item.lyricsId);
          const isOpen = !collapsed.has(item.lyricsId);
          return (
            <article
              key={item.lyricsId}
              id={id}
              aria-labelledby={`${id}-title`}
              className={`scroll-mt-16 bg-surface px-3 sm:scroll-mt-20 sm:rounded-xl sm:border sm:border-neutral-200 sm:px-4 sm:shadow-sm ${
                isOpen ? "pb-6 pt-3 sm:pb-6 sm:pt-4" : "py-2 sm:py-2"
              }`}
            >
              <h2 id={`${id}-title`} className="font-naskh">
                <button
                  type="button"
                  onClick={() => toggle(item.lyricsId)}
                  aria-expanded={isOpen}
                  aria-controls={`${id}-body`}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-start transition-colors hover:bg-ink/5 ${focusRing}`}
                >
                  <span
                    className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 px-2 text-sm font-semibold text-accent-strong"
                    aria-hidden="true"
                  >
                    {num(index + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="sr-only">النشيد {num(index + 1)}: </span>
                    <span className="block text-xl font-bold leading-snug sm:text-2xl">{item.title}</span>
                    {item.artist && <span className="mt-0.5 block font-sans text-sm font-normal text-accent">{item.artist}</span>}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-ink-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </h2>
              <div id={`${id}-body`} hidden={!isOpen}>
                {isOpen && (
                  <LyricsProse
                    html={item.contentHtml}
                    className={`mx-2 mt-3 border-t border-neutral-100 pt-4 ${LINE_SPACING_OVERRIDE[lineSpacing]}`}
                  />
                )}
              </div>
            </article>
          );
        })}
        <p className="py-2 text-center text-sm text-ink-5">انتهت الوصلة · {num(items.length)} نشيداً</p>
      </div>

      <FloatingIndexBar
        items={items}
        current={current}
        onPrev={() => jumpTo(current - 1)}
        onNext={() => jumpTo(current + 1)}
        onOpen={() => setIndexOpen(true)}
        expanded={indexOpen}
      />

      <IndexSheet open={indexOpen} items={items} current={current} onClose={() => setIndexOpen(false)} onPick={jumpTo} />
    </>
  );
}

function FloatingIndexBar({
  items,
  current,
  onPrev,
  onNext,
  onOpen,
  expanded,
}: {
  items: PlaylistBodyItem[];
  current: number;
  onPrev: () => void;
  onNext: () => void;
  onOpen: () => void;
  expanded: boolean;
}) {
  const item = items[current];
  const navBtn =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-fill-3 disabled:opacity-30 disabled:hover:bg-transparent " +
    focusRing;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="التنقّل بين أناشيد الوصلة"
        className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-full border border-line bg-surface/95 p-1 shadow-lg backdrop-blur"
      >
        <button type="button" onClick={onPrev} disabled={current === 0} aria-label="النشيد السابق" className={navBtn}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-expanded={expanded}
          aria-label={`فهرس الوصلة — النشيد ${num(current + 1)} من ${num(items.length)}: ${item?.title ?? ""}`}
          className={`flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full px-3 text-start transition-colors hover:bg-fill-3 ${focusRing}`}
        >
          <ListOrdered className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{item?.title}</span>
          <span className="shrink-0 text-sm tabular-nums text-ink-4">
            {num(current + 1)}/{num(items.length)}
          </span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={current === items.length - 1}
          aria-label="النشيد التالي"
          className={navBtn}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

function IndexSheet({
  open,
  items,
  current,
  onClose,
  onPick,
}: {
  open: boolean;
  items: PlaylistBodyItem[];
  current: number;
  onClose: () => void;
  onPick: (index: number) => void;
}) {
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    currentRef.current?.scrollIntoView({ block: "center" });
    currentRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="playlist-index-title">
      <button type="button" aria-label="إغلاق الفهرس" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-scrim/30" />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[75vh] max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl sm:bottom-6 sm:rounded-3xl">
        <span aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-neutral-200 sm:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
          <h2 id="playlist-index-title" className="text-[17px] font-bold">
            أناشيد الوصلة <span className="font-normal text-ink-4">({num(items.length)})</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-fill-3 ${focusRing}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <ol className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {items.map((item, index) => {
            const active = index === current;
            return (
              <li key={item.lyricsId}>
                <button
                  ref={active ? currentRef : undefined}
                  type="button"
                  onClick={() => onPick(index)}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-start transition-colors ${
                    active ? "bg-emerald-50" : "hover:bg-fill-3"
                  } ${focusRing}`}
                >
                  <span
                    className={`inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                      active ? "bg-emerald-700 text-white" : "bg-fill-2 text-ink-4"
                    }`}
                  >
                    {num(index + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-base font-bold ${active ? "text-accent-strong" : ""}`}>{item.title}</span>
                    {item.artist && <span className="block truncate text-[13px] text-ink-4">{item.artist}</span>}
                  </span>
                  {active && <span className="shrink-0 text-xs font-semibold text-accent">تقرأ الآن</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

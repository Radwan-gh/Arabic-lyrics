"use client";

import { useRef, useState } from "react";
import { ImageDown, Check, Loader2 } from "lucide-react";
import { lyricsProseFormatCls } from "@/lib/lyrics-prose";
import { readStoredLyricsScale } from "@/lib/lyrics-font";
import {
  extractParagraphs,
  isBlankParagraph,
  trimBlankEdges,
  toArabicDigits,
} from "@/lib/lyrics-pages";
import { btnSecondary } from "@/lib/ui";

// أبعاد البطاقة الملتقَطة، مُهيّأة للمشاركة على واتساب: عرض ثابت 1080 بكسل، فتظهر
// كبيرةً وواضحة في المحادثة دون قصّ أو تصغير مفرط. أحجام الخطوط والهوامش مكبَّرة من
// تصميم 640 بمعامل ~1.69.
const CARD_WIDTH = 1080;
// سقف ارتفاع الشريحة: نبقي المقاطع كاملةً (لا نقطع مقطعًا بين شريحتين)، فنحتاج
// متّسعًا كافيًا لحزم مقطعين فأكثر في الشريحة الواحدة وتقليل عدد الصور. 1620 عند
// عرض 1080 = نسبة 2:3 كحدٍّ أقصى، مناسبة للمشاركة على واتساب.
const TARGET_HEIGHT = 1620;
// حجم خطّ نصّ الأنشودة الأساسي داخل البطاقة (بكسل) عند معامل تكبير ‎1.
const LYRICS_BASE_FONT_PX = 34;
// أدنى ارتفاع نصّ لكلّ شريحة (وقايةً من عنوانٍ طويل جدًّا يبتلع كامل المساحة).
const MIN_LYRICS_BUDGET = 320;
// هامش علوي لكتلة الوسوم (marginTop) نحسبه ضمن مساحتها.
const TAG_BLOCK_MARGIN_TOP = 47;
// نافذة البحث عن حدّ مقطعٍ (فقرة فارغة) قرب نهاية الشريحة لقطعٍ أنظف.
const BLANK_LOOKBACK = 4;

interface ExportLyricsImageProps {
  /** Nasheed title. */
  title: string;
  /** Performer / munshid — shown under the title when present. */
  artist?: string | null;
  /** Album / source — shown as a subtle line when present. */
  album?: string | null;
  /** Sanitized lyrics HTML (paragraphs + inline bold/italic/underline). */
  contentHtml: string;
  /** Tags rendered as hashtags at the foot of the card. */
  tags: string[];
  /** Site host (e.g. "anaasheed.app") for the card footer; optional. */
  siteLabel?: string;
}

// اسم ملف آمن مشتقّ من العنوان: نُبقي الحروف العربية واللاتينية والأرقام ونستبدل
// ما عداها بشرطة، مع حدّ أقصى معقول للطول. عند تعدّد الشرائح نُضيف ترقيمًا لاتينيًّا.
function toFileName(title: string, index?: number, total?: number): string {
  const base =
    title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "نشيد";
  if (index && total && total > 1) return `${base}_${index}of${total}.png`;
  return `${base}.png`;
}

export function ExportLyricsImage({
  title,
  artist,
  album,
  contentHtml,
  tags,
  siteLabel,
}: ExportLyricsImageProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const footerMetaRef = useRef<HTMLSpanElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // يوزّع الفقرات على شرائح بحسب الارتفاع المقيس فعليًّا، مفضِّلًا القطع عند حدود
  // المقاطع (الفقرات الفارغة)، فتبقى كلّ شريحة ضمن النسبة المستهدفة.
  function paginate(paragraphs: string[]): string[][] {
    const lyrics = lyricsRef.current;
    const card = cardRef.current;
    const header = headerRef.current;
    const tagsEl = tagsRef.current;
    if (!lyrics || !card || !header || !tagsEl) return [paragraphs];

    // نقيس ارتفاع «الإطار» (رأس + تذييل + حشوات) في الحالتين لنعرف المساحة المتاحة
    // للنصّ: الشريحة الأولى تحمل الرأس، وما بعدها لا يحمله فتتّسع.
    // نتحكّم بالإظهار عبر style.display لا عبر hidden: الوسوم لها display:flex ضمنيّ
    // يتغلّب على قاعدة [hidden]{display:none}، فلا يُخفيها hidden.
    lyrics.innerHTML = "";
    tagsEl.style.display = "none";
    if (footerMetaRef.current) footerMetaRef.current.textContent = `${title} · ٩٩/٩٩`;

    header.style.display = "";
    const chromeFirst = card.offsetHeight;
    header.style.display = "none";
    const chromeRest = card.offsetHeight;

    // حجز مساحة للوسوم (تظهر في الشريحة الأخيرة) لضمان اتّساعها.
    let tagsReserve = 0;
    if (tags.length > 0) {
      tagsEl.style.display = "flex";
      tagsReserve = tagsEl.offsetHeight + TAG_BLOCK_MARGIN_TOP;
      tagsEl.style.display = "none";
    }

    const budgetFirst = Math.max(MIN_LYRICS_BUDGET, TARGET_HEIGHT - chromeFirst - tagsReserve);
    const budgetRest = Math.max(MIN_LYRICS_BUDGET, TARGET_HEIGHT - chromeRest - tagsReserve);

    const pages: string[][] = [];
    let start = 0;
    while (start < paragraphs.length) {
      const budget = pages.length === 0 ? budgetFirst : budgetRest;
      lyrics.innerHTML = "";
      let end = start;
      let lastBlank = -1;
      while (end < paragraphs.length) {
        lyrics.insertAdjacentHTML("beforeend", paragraphs[end]);
        if (lyrics.offsetHeight > budget && end > start) {
          lyrics.lastElementChild?.remove();
          break;
        }
        if (isBlankParagraph(paragraphs[end])) lastBlank = end;
        end++;
      }

      // إن قطعنا في منتصف مقطع وكان هناك حدّ مقطعٍ قريب، فلنقطع عنده بدل تمزيقه.
      let cut = end;
      if (
        cut < paragraphs.length &&
        lastBlank + 1 > start &&
        cut - (lastBlank + 1) <= BLANK_LOOKBACK
      ) {
        cut = lastBlank + 1;
      }

      const slice = trimBlankEdges(paragraphs.slice(start, cut));
      if (slice.length > 0) pages.push(slice);
      start = cut;
    }

    return pages.length > 0 ? pages : [paragraphs];
  }

  async function renderPage(
    toBlob: typeof import("html-to-image").toBlob,
    pageHtml: string,
    pageNo: number,
    total: number,
  ): Promise<Blob> {
    const card = cardRef.current!;
    const isFirst = pageNo === 1;
    const isLast = pageNo === total;

    if (headerRef.current) headerRef.current.style.display = isFirst ? "" : "none";
    if (lyricsRef.current) lyricsRef.current.innerHTML = pageHtml;
    if (tagsRef.current) {
      tagsRef.current.style.display = tags.length > 0 && isLast ? "flex" : "none";
    }
    if (footerMetaRef.current) {
      footerMetaRef.current.textContent =
        total > 1
          ? `${title} · ${toArabicDigits(pageNo)}/${toArabicDigits(total)}`
          : siteLabel ?? "";
    }

    const blob = await toBlob(card, {
      pixelRatio: 1,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    if (!blob) throw new Error("failed to render");
    return blob;
  }

  async function exportImage() {
    if (!cardRef.current || busy) return;

    setBusy(true);
    setError(null);
    try {
      // نطبّق حجم الخط الذي اختاره القارئ (متحكّم A− / A+) على نصّ الأنشودة، فتُطابق
      // الصورة المصدَّرة ما يراه على الشاشة (كلّما كبُر الخطّ زاد عدد الشرائح).
      if (lyricsRef.current) {
        const scale = readStoredLyricsScale();
        lyricsRef.current.style.fontSize = `${Math.round(LYRICS_BASE_FONT_PX * scale)}px`;
      }

      // نحمّل المكتبة عند الطلب فقط حتى لا تُثقِل حزمة الصفحة الأولى.
      const { toBlob } = await import("html-to-image");

      const paragraphs = extractParagraphs(contentHtml);
      const pages = paginate(paragraphs);
      const total = pages.length;

      const files: File[] = [];
      for (let i = 0; i < total; i++) {
        const blob = await renderPage(toBlob, pages[i].join(""), i + 1, total);
        files.push(new File([blob], toFileName(title, i + 1, total), { type: "image/png" }));
      }

      // على الجوال: نفتح ورقة المشاركة بالصور كلّها دفعةً واحدة (واتساب…).
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files })) {
        try {
          await nav.share({ files, title });
          setBusy(false);
          return;
        } catch {
          // ألغى المستخدم الورقة أو تعذّرت المشاركة — نُكمِل بالتنزيل.
        }
      }

      // على سطح المكتب أو تعذُّر المشاركة: ننزّل الشرائح تِباعًا.
      for (let i = 0; i < files.length; i++) {
        const url = URL.createObjectURL(files[i]);
        const a = document.createElement("a");
        a.href = url;
        a.download = files[i].name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        // مهلة صغيرة بين التنزيلات المتتابعة (تكبحها بعض المتصفّحات).
        if (i < files.length - 1) await new Promise((r) => setTimeout(r, 350));
      }

      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setError("تعذّر إنشاء الصورة");
      setTimeout(() => setError(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={exportImage}
        disabled={busy}
        aria-label="تصدير الأنشودة كصورة"
        title={error ? error : busy ? "جارٍ التصدير…" : done ? "تم" : "تصدير الأنشودة كصورة PNG"}
        className={`${btnSecondary} h-11 w-11 !p-0 ${error ? "border-red-300 text-red-700" : ""}`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : done ? (
          <Check className="h-6 w-6 text-emerald-700" aria-hidden="true" />
        ) : (
          <ImageDown className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* البطاقة المُلتقَطة: خارج الشاشة، بعرض ثابت لتخطيط ثابت عند الالتقاط. */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", top: 0, right: "-99999px", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
      >
        <div
          ref={cardRef}
          dir="rtl"
          className="font-sans"
          style={{ width: CARD_WIDTH, backgroundColor: "#ffffff", color: "#171717" }}
        >
          {/* شريط علوي بلون العلامة (على كلّ الشرائح) */}
          <div style={{ height: 13, backgroundColor: "#047857" }} />

          <div style={{ padding: "68px 74px 54px" }}>
            {/* الرأس: يظهر في الشريحة الأولى فقط */}
            <div ref={headerRef}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 50,
                  fontWeight: 800,
                  lineHeight: 1.35,
                  color: "#0a0a0a",
                  fontFamily: "var(--font-scheherazade), 'Amiri', serif",
                }}
              >
                {title}
              </h2>
              {artist ? (
                <p style={{ margin: "14px 0 0", fontSize: 30, fontWeight: 500, color: "#047857" }}>{artist}</p>
              ) : null}
              {album ? (
                <p style={{ margin: "7px 0 0", fontSize: 24, color: "#737373" }}>{album}</p>
              ) : null}
              <div style={{ height: 1, backgroundColor: "#e5e5e5", margin: "40px 0" }} />
            </div>

            <div
              ref={lyricsRef}
              className={lyricsProseFormatCls}
              style={{ fontSize: LYRICS_BASE_FONT_PX, lineHeight: 2 }}
            />

            {/* الوسوم: تظهر في الشريحة الأخيرة فقط */}
            <div ref={tagsRef} style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: TAG_BLOCK_MARGIN_TOP }}>
              {tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 22,
                    color: "#525252",
                    backgroundColor: "#f5f5f5",
                    borderRadius: 9999,
                    padding: "7px 20px",
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>

            <div
              style={{
                marginTop: 54,
                paddingTop: 27,
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
              }}
            >
              <span style={{ fontSize: 25, fontWeight: 700, color: "#047857", flexShrink: 0 }}>أناشيد</span>
              <span
                ref={footerMetaRef}
                style={{
                  fontSize: 22,
                  color: "#a3a3a3",
                  maxWidth: 720,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

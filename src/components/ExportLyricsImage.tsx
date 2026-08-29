"use client";

import { useRef, useState } from "react";
import { ImageDown, Check, Loader2 } from "lucide-react";
import { lyricsProseFormatCls } from "@/lib/lyrics-prose";
import { readStoredLyricsScale } from "@/lib/lyrics-font";
import { btnSecondary } from "@/lib/ui";

// حجم خطّ نصّ الأنشودة الأساسي داخل البطاقة (بكسل) عند معامل تكبير ‎1.
const LYRICS_BASE_FONT_PX = 20;

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
// ما عداها بشرطة، مع حدّ أقصى معقول للطول.
function toFileName(title: string): string {
  const base = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return `${base || "نشيد"}.png`;
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
  const lyricsRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportImage() {
    const node = cardRef.current;
    if (!node || busy) return;

    setBusy(true);
    setError(null);
    try {
      // نطبّق حجم الخط الذي اختاره القارئ (متحكّم A− / A+) على نصّ الأنشودة داخل
      // البطاقة، فتُطابق الصورة المصدَّرة ما يراه على الشاشة.
      if (lyricsRef.current) {
        const scale = readStoredLyricsScale();
        lyricsRef.current.style.fontSize = `${Math.round(LYRICS_BASE_FONT_PX * scale)}px`;
      }

      // نحمّل المكتبة عند الطلب فقط حتى لا تُثقِل حزمة الصفحة الأولى.
      const { toBlob } = await import("html-to-image");

      const blob = await toBlob(node, {
        // دقّة مضاعفة لنصّ حادّ عند العرض على الشاشات والمشاركة.
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      if (!blob) throw new Error("failed to render");

      const file = new File([blob], toFileName(title), { type: "image/png" });

      // على الجوال: نفتح ورقة المشاركة مباشرةً (واتساب…) بالصورة نفسها.
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title });
          setBusy(false);
          return;
        } catch {
          // ألغى المستخدم الورقة أو تعذّرت المشاركة — نُكمِل بالتنزيل.
        }
      }

      // على سطح المكتب أو تعذُّر المشاركة: ننزّل ملف PNG.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

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
        title="تصدير الأنشودة كصورة PNG"
        className={`${btnSecondary} h-11 px-4 ${error ? "border-red-300 text-red-700" : ""}`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : done ? (
          <Check className="h-5 w-5 text-emerald-700" aria-hidden="true" />
        ) : (
          <ImageDown className="h-5 w-5" aria-hidden="true" />
        )}
        <span>{error ? error : busy ? "جارٍ التصدير…" : done ? "تم" : "صورة"}</span>
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
          style={{ width: 640, backgroundColor: "#ffffff", color: "#171717" }}
        >
          {/* شريط علوي بلون العلامة */}
          <div style={{ height: 8, backgroundColor: "#047857" }} />

          <div style={{ padding: "40px 44px 32px" }}>
            <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, lineHeight: 1.35, color: "#0a0a0a" }}>
              {title}
            </h2>
            {artist ? (
              <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 500, color: "#047857" }}>{artist}</p>
            ) : null}
            {album ? (
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#737373" }}>{album}</p>
            ) : null}

            <div style={{ height: 1, backgroundColor: "#e5e5e5", margin: "24px 0" }} />

            <div
              ref={lyricsRef}
              className={lyricsProseFormatCls}
              style={{ fontSize: LYRICS_BASE_FONT_PX, lineHeight: 2 }}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {tags.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 28 }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 13,
                      color: "#525252",
                      backgroundColor: "#f5f5f5",
                      borderRadius: 9999,
                      padding: "4px 12px",
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 32,
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: "#047857" }}>أناشيد</span>
              {siteLabel ? (
                <span style={{ fontSize: 13, color: "#a3a3a3", direction: "ltr" }}>{siteLabel}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

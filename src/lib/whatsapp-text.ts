// نصّ واتساب لنشيد من HTML مُنقّى مسبقًا (contentHtml) — بلا اعتماد على أدوات
// الخادم، فيعمل في المتصفح أيضًا (صفحة النشيد دون اتصال).

/**
 * Build a WhatsApp-friendly plain-text version of a nasheed for sharing/copying.
 *
 * WhatsApp markup: *bold*, _italic_, ~strikethrough~. Bold text therefore lives
 * between single asterisks (`*`). Output layout:
 *
 *   *العنوان*
 *   المنشد            ← only when present
 *
 *   ...الكلمات...
 *
 *   #وسم1 #وسم2       ← only when there are tags
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");
}

function htmlToWhatsAppText(html: string): string {
  const text = html
    // Wrap inline emphasis with the matching WhatsApp marker, trimming inner
    // whitespace so the markers sit against non-space characters (WhatsApp only
    // renders them that way).
    .replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_, inner: string) => {
      const t = inner.trim();
      return t ? `*${t}*` : "";
    })
    .replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (_, inner: string) => {
      const t = inner.trim();
      return t ? `_${t}_` : "";
    })
    // Block/line breaks become newlines.
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    // Drop every remaining tag (opening <p>, <u>, …).
    .replace(/<[^>]+>/g, "");

  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    // Collapse 3+ blank lines down to a single blank line.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface WhatsAppLyricsHtmlInput {
  title: string;
  artist?: string | null;
  /** HTML مُنقّى عبر renderLyricsHtml. */
  html: string;
  tags: string[];
}

export function buildWhatsAppLyricsFromHtml({ title, artist, html, tags }: WhatsAppLyricsHtmlInput): string {
  const parts: string[] = [];

  const header = artist ? `*${title}*\n${artist}` : `*${title}*`;
  parts.push(header);

  const body = htmlToWhatsAppText(html);
  if (body) parts.push(body);

  if (tags.length > 0) {
    parts.push(tags.map((tag) => `#${tag.replace(/\s+/g, "_")}`).join(" "));
  }

  return parts.join("\n\n");
}

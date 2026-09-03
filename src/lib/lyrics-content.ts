const HTML_START_RE = /^\s*<(p|br)\b/i;

export function isHtmlLyricsContent(content: string): boolean {
  return HTML_START_RE.test(content);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function legacyPlainTextToHtml(text: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
    .join("");
}

/**
 * Applies WhatsApp-style inline markers to a single, already HTML-escaped line:
 * `*bold*` -> `<strong>`, `_italic_` -> `<em>`. Unmatched markers stay literal.
 * Same marker convention the app uses for WhatsApp sharing (see whatsapp-lyrics).
 */
function applyInlineMarkers(escapedLine: string): string {
  return escapedLine
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>");
}

/**
 * Turns the editor's plain text into the stored `<p>` HTML, interpreting the
 * `*bold*` / `_italic_` markers produced by the formatting bar. Inverse of
 * `htmlToPlainText`, so `text -> html -> text` round-trips losslessly.
 */
export function lyricsTextToHtml(text: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => {
      const inner = applyInlineMarkers(escapeHtml(line));
      return `<p>${inner || "<br>"}</p>`;
    })
    .join("");
}

export function toEditableHtml(content: string): string {
  return isHtmlLyricsContent(content) ? content : legacyPlainTextToHtml(content);
}

/**
 * Converts stored lyrics content into plain text with newlines, suitable for a
 * plain `<textarea>` editor. Legacy plain-text content is returned unchanged;
 * HTML content has its paragraphs/line-breaks turned into `\n` and its inline
 * emphasis turned back into `*bold*` / `_italic_` markers. Pairs with
 * `lyricsTextToHtml` for a lossless round-trip of the editor's text.
 */
export function htmlToPlainText(content: string): string {
  if (!isHtmlLyricsContent(content)) return content;

  return content
    // An empty paragraph is a single blank line.
    .replace(/<p[^>]*>\s*<br\s*\/?>\s*<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Inline emphasis -> WhatsApp-style markers the formatting bar understands.
    .replace(/<(?:strong|b)\b[^>]*>/gi, "*")
    .replace(/<\/(?:strong|b)>/gi, "*")
    .replace(/<(?:em|i)\b[^>]*>/gi, "_")
    .replace(/<\/(?:em|i)>/gi, "_")
    // Drop any other tag (e.g. legacy <u> underline).
    .replace(/<[^>]+>/g, "")
    // Decode the entities produced by `escapeHtml` (&amp; must come last).
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    // The final `</p>` leaves a trailing newline we don't want in the editor.
    .replace(/\n$/, "");
}

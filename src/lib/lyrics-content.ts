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

export function toEditableHtml(content: string): string {
  return isHtmlLyricsContent(content) ? content : legacyPlainTextToHtml(content);
}

/**
 * Converts stored lyrics content into plain text with newlines, suitable for a
 * plain `<textarea>` editor. Legacy plain-text content is returned unchanged;
 * HTML content has its paragraphs/line-breaks turned into `\n` and every other
 * tag stripped. Pairs with `legacyPlainTextToHtml` for a lossless round-trip of
 * plain lyrics (`text -> html -> text`).
 */
export function htmlToPlainText(content: string): string {
  if (!isHtmlLyricsContent(content)) return content;

  return content
    // An empty paragraph is a single blank line.
    .replace(/<p[^>]*>\s*<br\s*\/?>\s*<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Drop any remaining inline formatting tags (bold/italic/underline).
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

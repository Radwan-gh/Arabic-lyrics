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

import { toEditableHtml } from "./lyrics-content";
import { sanitizeLyricsHtml } from "./sanitize-lyrics";

export function renderLyricsHtml(content: string): string {
  return sanitizeLyricsHtml(toEditableHtml(content));
}

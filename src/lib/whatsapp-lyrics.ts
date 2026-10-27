import { renderLyricsHtml } from "./render-lyrics";
import { buildWhatsAppLyricsFromHtml } from "./whatsapp-text";

export interface WhatsAppLyricsInput {
  title: string;
  artist?: string | null;
  content: string;
  tags: string[];
}

/** Build a WhatsApp-friendly plain-text version of a nasheed (see whatsapp-text.ts). */
export function buildWhatsAppLyrics({ title, artist, content, tags }: WhatsAppLyricsInput): string {
  return buildWhatsAppLyricsFromHtml({ title, artist, html: renderLyricsHtml(content), tags });
}

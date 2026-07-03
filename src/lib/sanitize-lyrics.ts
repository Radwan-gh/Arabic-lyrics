import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u"];

export function sanitizeLyricsHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    allowedSchemes: [],
    disallowedTagsMode: "discard",
  });
}

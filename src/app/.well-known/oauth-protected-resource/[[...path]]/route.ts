import { appOrigin } from "@/lib/google-oauth";
import { CORS_HEADERS, corsPreflight, protectedResourceMetadata } from "@/lib/mcp/oauth";

// بيانات المورد المحمي (RFC 9728). تُخدم على الجذر وعلى ‎/api/mcp معاً، لأن
// العملاء يجرّبون المسار الخاص بالمورد أولاً ثم الجذر.
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return Response.json(protectedResourceMetadata(appOrigin(req)), { headers: CORS_HEADERS });
}

export const OPTIONS = corsPreflight;

import { appOrigin } from "@/lib/google-oauth";
import { authorizationServerMetadata, CORS_HEADERS, corsPreflight } from "@/lib/mcp/oauth";

// بيانات خادم التفويض (RFC 8414) التي يكتشف منها عميل MCP نقاط تسجيل الدخول.
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return Response.json(authorizationServerMetadata(appOrigin(req)), { headers: CORS_HEADERS });
}

export const OPTIONS = corsPreflight;

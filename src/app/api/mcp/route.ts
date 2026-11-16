import type { NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { appOrigin } from "@/lib/google-oauth";
import { buildMcpServer, findActiveMcpUser } from "@/lib/mcp/server";
import { CORS_HEADERS, corsPreflight, protectedResourceMetadataUrl, verifyAccessToken } from "@/lib/mcp/oauth";

// خادم MCP عبر Streamable HTTP بلا جلسات (stateless): كل طلب يبني خادماً ونقلاً
// جديدين ثم يغلقهما. كل طلب يحتاج رمز وصول من تدفّق OAuth (تسجيل الدخول في
// التطبيق)؛ بدونه تُرجع 401 مع رابط بيانات المورد، فيبدأ العميل تسجيل الدخول.
export const dynamic = "force-dynamic";

function unauthorized(origin: string, hadToken: boolean) {
  const params = [`resource_metadata="${protectedResourceMetadataUrl(origin)}"`];
  if (hadToken) params.push('error="invalid_token"');
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message: "يجب تسجيل الدخول إلى نفحات" }, id: null },
    { status: 401, headers: { ...CORS_HEADERS, "WWW-Authenticate": `Bearer ${params.join(", ")}` } },
  );
}

async function handle(req: NextRequest): Promise<Response> {
  const origin = appOrigin(req);
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]?.trim();
  if (!token) return unauthorized(origin, false);

  const userId = await verifyAccessToken(token, origin);
  const user = userId ? await findActiveMcpUser(userId) : null;
  if (!user) return unauthorized(origin, true);

  const server = buildMcpServer(user, origin);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    const res = await transport.handleRequest(req);
    for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
    return res;
  } finally {
    await server.close();
  }
}

export { handle as GET, handle as POST, handle as DELETE };
export const OPTIONS = corsPreflight;

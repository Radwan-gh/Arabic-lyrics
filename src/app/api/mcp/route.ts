import { NextResponse, type NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { prisma } from "@/lib/prisma";
import { verifyMcpToken } from "@/lib/jwt";
import { buildMcpServer, type McpUser } from "@/lib/mcp/server";

// خادم MCP عبر Streamable HTTP بلا جلسات (stateless): كل طلب يبني خادماً ونقلاً
// جديدين ثم يغلقهما. بلا ترويسة Authorization يعمل الطلب كزائر (أدوات القراءة
// فقط)؛ أما الرمز غير الصالح فيُرفض صراحةً بدل التراجع بصمت إلى وضع الزائر.
export const dynamic = "force-dynamic";

type Auth = { ok: true; user: McpUser | null } | { ok: false };

async function authenticate(req: NextRequest): Promise<Auth> {
  const header = req.headers.get("authorization");
  if (!header) return { ok: true, user: null };

  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  const userId = token ? await verifyMcpToken(token) : null;
  if (!userId) return { ok: false };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, isActive: true, isApproved: true },
  });
  if (!user || !user.isActive || !user.isApproved) return { ok: false };
  return { ok: true, user: { userId: user.id, name: user.name, role: user.role } };
}

function origin(req: NextRequest) {
  return process.env.APP_URL?.replace(/\/+$/, "") || req.nextUrl.origin;
}

async function handle(req: NextRequest): Promise<Response> {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "رمز MCP غير صالح أو الحساب غير مفعّل" }, id: null },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' } },
    );
  }

  const server = buildMcpServer(auth.user, origin(req));
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
}

export { handle as GET, handle as POST, handle as DELETE };

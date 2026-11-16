import { CORS_HEADERS, corsPreflight, registerClient } from "@/lib/mcp/oauth";

// تسجيل عميل MCP ديناميكياً (RFC 7591). عملاء عامّون فقط (بلا سرّ)، وPKCE إلزامي.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await registerClient(body);
  if (!result.ok) {
    return Response.json(
      { error: result.error, error_description: result.description },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { client } = result;
  return Response.json(
    {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS_HEADERS },
  );
}

export const OPTIONS = corsPreflight;

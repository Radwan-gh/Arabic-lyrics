import { appOrigin } from "@/lib/google-oauth";
import { findActiveMcpUser } from "@/lib/mcp/server";
import { CORS_HEADERS, corsPreflight, issueTokens, redeemAuthorizationCode, redeemRefreshToken } from "@/lib/mcp/oauth";

// نقطة الرموز: تبادل رمز التفويض (مع PKCE) أو تجديد رمز الوصول. حالة الحساب
// تُفحص هنا أيضاً، فالحساب المعطَّل لا يجدّد رموزه.
const HEADERS = { ...CORS_HEADERS, "Cache-Control": "no-store" };

function oauthError(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, { status, headers: HEADERS });
}

async function readParams(req: Request): Promise<URLSearchParams> {
  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return new URLSearchParams(
      Object.entries(body ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
  }
  return new URLSearchParams(await req.text());
}

export async function POST(req: Request) {
  const origin = appOrigin(req);
  const params = await readParams(req);
  const grantType = params.get("grant_type");

  const grant =
    grantType === "authorization_code"
      ? await redeemAuthorizationCode(params, origin)
      : grantType === "refresh_token"
        ? await redeemRefreshToken(params, origin)
        : null;
  if (!grant) return oauthError("unsupported_grant_type", "grant_type must be authorization_code or refresh_token");
  if (!grant.ok) return oauthError(grant.error, grant.description);

  if (!(await findActiveMcpUser(grant.userId))) {
    return oauthError("invalid_grant", "account is disabled or pending approval");
  }

  return Response.json(await issueTokens(grant.userId, grant.clientId, grant.resource), { headers: HEADERS });
}

export const OPTIONS = corsPreflight;

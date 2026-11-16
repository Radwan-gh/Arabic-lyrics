import { signPurposeToken, verifyPurposeToken } from "@/lib/jwt";
import { pkceChallenge, randomToken } from "@/lib/google-oauth";

/**
 * خادم تفويض OAuth 2.1 مدمج لخادم MCP (‎/api/mcp)، وفق مواصفة تفويض MCP:
 * عميل MCP (Claude Code، claude.ai…) يكتشف نقاط النهاية من ‎/.well-known، ويسجّل
 * نفسه ديناميكياً (RFC 7591)، ثم يوجّه المستخدم لتسجيل الدخول المعتاد في التطبيق
 * والموافقة، فيحصل على رمز وصول مقيّد بالـ resource (RFC 8707) مع PKCE (S256).
 *
 * بلا جداول: كل الحالة رموز JWT موقّعة بـ JWT_SECRET — client_id نفسه يحمل
 * redirect_uris المسجّلة، ورمز التفويض يحمل المستخدم وتحدّي PKCE. الدور وحالة
 * الحساب يُقرآن من القاعدة عند كل طلب MCP وكل تجديد، فتعطيل الحساب يسري فوراً.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL = "90d";
const AUTH_CODE_TTL_SECONDS = 5 * 60;

export const MCP_PATH = "/api/mcp";
export const AUTHORIZE_PATH = "/oauth/authorize";

export function mcpResource(origin: string) {
  return `${origin}${MCP_PATH}`;
}

export function protectedResourceMetadataUrl(origin: string) {
  return `${origin}/.well-known/oauth-protected-resource${MCP_PATH}`;
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: mcpResource(origin),
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    resource_name: "نفحات",
  };
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}${AUTHORIZE_PATH}`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}

/** عملاء MCP قد يعملون في المتصفح (MCP Inspector مثلاً): لا كوكيز هنا، فـ * آمنة. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ---------------------------------------------------------------------------
// تسجيل العملاء
// ---------------------------------------------------------------------------

export interface OAuthClient {
  clientId: string;
  clientName: string;
  redirectUris: string[];
}

const BLOCKED_SCHEMES = new Set(["javascript:", "data:", "file:", "vbscript:", "about:", "blob:"]);

function isLoopback(url: URL) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
}

/** https، أو http على localhost (تطبيقات سطح المكتب مثل Claude Code)، أو مخطط خاص بتطبيق أصلي. */
function isAcceptableRedirectUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return isLoopback(url);
  return !BLOCKED_SCHEMES.has(url.protocol);
}

export type RegistrationResult =
  | { ok: true; client: OAuthClient }
  | { ok: false; error: string; description: string };

export async function registerClient(body: unknown): Promise<RegistrationResult> {
  const meta = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const redirectUris = meta.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10) {
    return { ok: false, error: "invalid_redirect_uri", description: "redirect_uris is required (1–10 URIs)" };
  }
  if (!redirectUris.every(isAcceptableRedirectUri)) {
    return { ok: false, error: "invalid_redirect_uri", description: "redirect_uris must be https, http on localhost, or a private app scheme" };
  }
  const authMethod = meta.token_endpoint_auth_method ?? "none";
  if (authMethod !== "none") {
    return { ok: false, error: "invalid_client_metadata", description: "only public clients (token_endpoint_auth_method=none) are supported" };
  }

  const clientName =
    typeof meta.client_name === "string" && meta.client_name.trim() ? meta.client_name.trim().slice(0, 100) : "تطبيق MCP";
  const clientId = await signPurposeToken("oauth_client", { name: clientName, redirect_uris: redirectUris }, null);
  return { ok: true, client: { clientId, clientName, redirectUris } };
}

export async function getClient(clientId: string | null | undefined): Promise<OAuthClient | null> {
  if (!clientId) return null;
  const payload = await verifyPurposeToken(clientId, "oauth_client");
  if (!payload || typeof payload.name !== "string" || !Array.isArray(payload.redirect_uris)) return null;
  return { clientId, clientName: payload.name, redirectUris: payload.redirect_uris as string[] };
}

/** مطابقة تامة، عدا المنفذ في عناوين localhost (RFC 8252 §7.3: يختاره التطبيق عند التشغيل). */
export function clientAllowsRedirect(client: OAuthClient, redirectUri: string): boolean {
  let requested: URL;
  try {
    requested = new URL(redirectUri);
  } catch {
    return false;
  }
  return client.redirectUris.some((registered) => {
    if (registered === redirectUri) return true;
    const reg = new URL(registered);
    return (
      reg.protocol === "http:" &&
      isLoopback(reg) &&
      requested.protocol === "http:" &&
      reg.hostname === requested.hostname &&
      reg.pathname === requested.pathname &&
      reg.search === requested.search
    );
  });
}

// ---------------------------------------------------------------------------
// طلب التفويض
// ---------------------------------------------------------------------------

export interface AuthorizeRequest {
  client: OAuthClient;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  resource: string;
}

export type AuthorizeValidation =
  | { ok: true; request: AuthorizeRequest }
  /** لا يُوثَق بـ redirect_uri: تُعرض الرسالة للمستخدم بدل التوجيه (RFC 6749 §4.1.2.1). */
  | { ok: false; fatal: true; message: string }
  | { ok: false; fatal: false; redirectTo: string };

function sameResource(a: string, b: string) {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
}

export function errorRedirect(redirectUri: string, state: string | null, error: string, description?: string) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (description) url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

export async function validateAuthorizeRequest(
  params: Record<string, string | undefined>,
  origin: string,
): Promise<AuthorizeValidation> {
  const client = await getClient(params.client_id);
  if (!client) return { ok: false, fatal: true, message: "التطبيق الذي طلب الربط غير معروف. أعد إضافة الخادم من التطبيق ثم حاول مجدداً." };

  const redirectUri = params.redirect_uri ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined);
  if (!redirectUri || !clientAllowsRedirect(client, redirectUri)) {
    return { ok: false, fatal: true, message: "عنوان العودة في طلب الربط غير مطابق لما سجّله التطبيق." };
  }

  const state = params.state ?? null;
  const fail = (error: string, description: string) =>
    ({ ok: false, fatal: false, redirectTo: errorRedirect(redirectUri, state, error, description) }) as const;

  if (params.response_type !== "code") return fail("unsupported_response_type", "only response_type=code is supported");
  if (!params.code_challenge || params.code_challenge_method !== "S256") {
    return fail("invalid_request", "PKCE with code_challenge_method=S256 is required");
  }

  const resource = params.resource ?? mcpResource(origin);
  if (!sameResource(resource, mcpResource(origin))) return fail("invalid_target", "unknown resource");

  return { ok: true, request: { client, redirectUri, state, codeChallenge: params.code_challenge, resource: mcpResource(origin) } };
}

export async function issueAuthorizationCode(request: AuthorizeRequest, userId: string): Promise<string> {
  return signPurposeToken(
    "oauth_code",
    {
      jti: randomToken(),
      userId,
      client_id: request.client.clientId,
      redirect_uri: request.redirectUri,
      code_challenge: request.codeChallenge,
      resource: request.resource,
    },
    `${AUTH_CODE_TTL_SECONDS}s`,
  );
}

// ---------------------------------------------------------------------------
// نقطة الرموز
// ---------------------------------------------------------------------------

// رمز التفويض يُستعمل مرة واحدة. السجلّ في الذاكرة يكفي لخادم واحد (Railway)،
// ومع عدّة نسخ يبقى PKCE والصلاحية القصيرة (5 دقائق) خط الدفاع.
const usedCodes = new Map<string, number>();

function consumeCode(jti: string, expiresAtMs: number): boolean {
  const now = Date.now();
  for (const [key, exp] of usedCodes) if (exp < now) usedCodes.delete(key);
  if (usedCodes.has(jti)) return false;
  usedCodes.set(jti, expiresAtMs);
  return true;
}

export type TokenGrant =
  | { ok: true; userId: string; clientId: string; resource: string }
  | { ok: false; error: string; description: string };

export async function redeemAuthorizationCode(params: URLSearchParams, origin: string): Promise<TokenGrant> {
  const code = params.get("code");
  const verifier = params.get("code_verifier");
  if (!code || !verifier) return { ok: false, error: "invalid_request", description: "code and code_verifier are required" };

  const payload = await verifyPurposeToken(code, "oauth_code");
  if (!payload || typeof payload.userId !== "string" || typeof payload.jti !== "string") {
    return { ok: false, error: "invalid_grant", description: "invalid or expired code" };
  }
  if (params.get("client_id") && params.get("client_id") !== payload.client_id) {
    return { ok: false, error: "invalid_grant", description: "code was issued to another client" };
  }
  const redirectUri = params.get("redirect_uri");
  if (redirectUri && redirectUri !== payload.redirect_uri) {
    return { ok: false, error: "invalid_grant", description: "redirect_uri mismatch" };
  }
  const resource = params.get("resource");
  if (resource && !sameResource(resource, mcpResource(origin))) {
    return { ok: false, error: "invalid_target", description: "unknown resource" };
  }
  if ((await pkceChallenge(verifier)) !== payload.code_challenge) {
    return { ok: false, error: "invalid_grant", description: "PKCE verification failed" };
  }
  if (!consumeCode(payload.jti, Number(payload.exp ?? 0) * 1000)) {
    return { ok: false, error: "invalid_grant", description: "code already used" };
  }
  return { ok: true, userId: payload.userId, clientId: payload.client_id as string, resource: mcpResource(origin) };
}

export async function redeemRefreshToken(params: URLSearchParams, origin: string): Promise<TokenGrant> {
  const token = params.get("refresh_token");
  if (!token) return { ok: false, error: "invalid_request", description: "refresh_token is required" };

  const payload = await verifyPurposeToken(token, "mcp_refresh", mcpResource(origin));
  if (!payload || typeof payload.userId !== "string" || typeof payload.client_id !== "string") {
    return { ok: false, error: "invalid_grant", description: "invalid or expired refresh token" };
  }
  if (params.get("client_id") && params.get("client_id") !== payload.client_id) {
    return { ok: false, error: "invalid_grant", description: "refresh token was issued to another client" };
  }
  return { ok: true, userId: payload.userId, clientId: payload.client_id, resource: mcpResource(origin) };
}

export async function issueTokens(userId: string, clientId: string, resource: string) {
  const [accessToken, refreshToken] = await Promise.all([
    signPurposeToken("mcp_access", { userId }, `${ACCESS_TOKEN_TTL_SECONDS}s`, resource),
    signPurposeToken("mcp_refresh", { userId, client_id: clientId }, REFRESH_TOKEN_TTL, resource),
  ]);
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
  };
}

/** معرّف المستخدم من رمز وصول صالح لهذا الـ resource تحديداً، وإلا null. */
export async function verifyAccessToken(token: string, origin: string): Promise<string | null> {
  const payload = await verifyPurposeToken(token, "mcp_access", mcpResource(origin));
  return typeof payload?.userId === "string" ? payload.userId : null;
}

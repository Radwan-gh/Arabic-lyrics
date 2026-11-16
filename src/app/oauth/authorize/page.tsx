import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { originFromHeaders } from "@/lib/google-oauth";
import { findActiveMcpUser } from "@/lib/mcp/server";
import { AUTHORIZE_PATH, validateAuthorizeRequest } from "@/lib/mcp/oauth";
import { OAuthConsent, OAuthError } from "@/components/OAuthConsent";

// نقطة التفويض: عميل MCP يوجّه المستخدم إلى هنا. بلا جلسة يمرّ بشاشة الدخول
// المعتادة (كلمة المرور أو Google) ثم يعود، فتُعرض شاشة الموافقة.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuthorizePage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  const origin = originFromHeaders(await headers());

  const validation = await validateAuthorizeRequest(params, origin);
  if (!validation.ok) {
    if (validation.fatal) return <OAuthError message={validation.message} />;
    redirect(validation.redirectTo);
  }

  const session = await getCurrentUser();
  if (!session) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/login?next=${encodeURIComponent(`${AUTHORIZE_PATH}?${query}`)}`);
  }

  const user = await findActiveMcpUser(session.userId);
  if (!user) return <OAuthError message="حسابك غير مفعّل حالياً، يرجى التواصل مع الإدارة." />;

  const { request } = validation;
  return (
    <OAuthConsent
      clientName={request.client.clientName}
      redirectHost={new URL(request.redirectUri).host || new URL(request.redirectUri).protocol}
      userName={user.name}
      role={user.role}
      fields={{
        client_id: request.client.clientId,
        redirect_uri: request.redirectUri,
        response_type: "code",
        code_challenge: request.codeChallenge,
        code_challenge_method: "S256",
        resource: request.resource,
        ...(request.state ? { state: request.state } : {}),
      }}
    />
  );
}

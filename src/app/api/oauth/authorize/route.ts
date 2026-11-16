import { appOrigin } from "@/lib/google-oauth";
import { getCurrentUser } from "@/lib/session";
import { findActiveMcpUser } from "@/lib/mcp/server";
import { errorRedirect, issueAuthorizationCode, validateAuthorizeRequest } from "@/lib/mcp/oauth";

// استلام قرار شاشة الموافقة. كوكي الجلسة SameSite=Lax فلا يُرسَل مع POST من موقع
// آخر، ونرفض أيضاً أي Origin غير أصل التطبيق — فلا يمكن انتزاع موافقة خفية.
function seeOther(location: string) {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const origin = appOrigin(req);
  const requestOrigin = req.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) {
    return Response.json({ error: "طلب غير مسموح" }, { status: 403 });
  }

  const form = await req.formData();
  const params = Object.fromEntries(
    [...form.entries()].filter((e): e is [string, string] => typeof e[1] === "string"),
  ) as Record<string, string | undefined>;

  const validation = await validateAuthorizeRequest(params, origin);
  if (!validation.ok) {
    return validation.fatal ? Response.json({ error: validation.message }, { status: 400 }) : seeOther(validation.redirectTo);
  }
  const { request } = validation;

  if (params.decision !== "allow") {
    return seeOther(errorRedirect(request.redirectUri, request.state, "access_denied", "the user denied access"));
  }

  const session = await getCurrentUser();
  const user = session ? await findActiveMcpUser(session.userId) : null;
  if (!user) return Response.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const url = new URL(request.redirectUri);
  url.searchParams.set("code", await issueAuthorizationCode(request, user.userId));
  if (request.state) url.searchParams.set("state", request.state);
  url.searchParams.set("iss", origin);
  return seeOther(url.toString());
}

import { NextResponse } from "next/server";
import {
  CALLBACK_PATH,
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  appOrigin,
  buildAuthUrl,
  isGoogleAuthEnabled,
  pkceChallenge,
  randomToken,
  safeNextPath,
} from "@/lib/google-oauth";

// يبدأ تدفّق الدخول/التسجيل عبر Google: يولّد state و PKCE ويحفظهما في كعكة
// قصيرة العمر ثم يحوّل إلى شاشة اختيار حساب Google.
export async function GET(req: Request) {
  const origin = appOrigin(req);
  if (!isGoogleAuthEnabled()) {
    return NextResponse.redirect(new URL("/login?error=google_disabled", origin));
  }

  const next = safeNextPath(new URL(req.url).searchParams.get("next"));
  const state = randomToken();
  const verifier = randomToken();

  const res = NextResponse.redirect(
    buildAuthUrl({
      redirectUri: `${origin}${CALLBACK_PATH}`,
      state,
      codeChallenge: await pkceChallenge(verifier),
    }),
  );
  res.cookies.set(GOOGLE_OAUTH_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

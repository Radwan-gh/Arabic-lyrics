import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  createGoogleSignupToken,
  createSessionToken,
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_SIGNUP_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/jwt";
import {
  CALLBACK_PATH,
  GOOGLE_OAUTH_COOKIE,
  appOrigin,
  exchangeCodeForProfile,
  isGoogleAuthEnabled,
  safeNextPath,
  type GoogleProfile,
} from "@/lib/google-oauth";

/**
 * عودة Google بعد اختيار الحساب:
 * 1. حساب مربوط بـ Google مسبقاً → يُستخدم.
 * 2. حساب موجود بنفس البريد (مُتحقَّق منه لدى Google) → يُربط بـ Google.
 * 3. لا حساب → تُحفظ الهوية في كعكة موقّعة ويُحوَّل المستخدم إلى /signup/complete
 *    ليكتب اسمه الكامل؛ هناك يُنشأ حساب «قارئ» بانتظار موافقة الأدمن.
 * لا تُنشأ جلسة إلا لحساب مفعّل ومُوافَق عليه.
 */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const loginRedirect = (param: string) => {
    const res = NextResponse.redirect(new URL(`/login?${param}`, origin));
    res.cookies.set(GOOGLE_OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };

  if (!isGoogleAuthEnabled()) return loginRedirect("error=google_disabled");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  let saved: { state?: string; verifier?: string; next?: string } | null = null;
  try {
    saved = JSON.parse(store.get(GOOGLE_OAUTH_COOKIE)?.value ?? "null");
  } catch {
    saved = null;
  }

  // ألغى المستخدم الاختيار في شاشة Google.
  if (url.searchParams.get("error")) return loginRedirect("error=google_cancelled");

  if (!code || !state || !saved?.state || !saved.verifier || saved.state !== state) {
    return loginRedirect("error=google_failed");
  }

  let profile: GoogleProfile;
  try {
    profile = await exchangeCodeForProfile({
      code,
      codeVerifier: saved.verifier,
      redirectUri: `${origin}${CALLBACK_PATH}`,
    });
  } catch (error) {
    console.error(error);
    return loginRedirect("error=google_failed");
  }

  if (!profile.emailVerified) return loginRedirect("error=google_unverified");

  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      if (byEmail.googleId && byEmail.googleId !== profile.sub) return loginRedirect("error=google_failed");
      user = await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub } });
    } else {
      const res = NextResponse.redirect(new URL("/signup/complete", origin));
      res.cookies.set(GOOGLE_OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
      res.cookies.set(GOOGLE_SIGNUP_COOKIE, await createGoogleSignupToken({ googleId: profile.sub, email: profile.email }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GOOGLE_SIGNUP_MAX_AGE_SECONDS,
      });
      return res;
    }
  }

  if (!user.isApproved) return loginRedirect("status=pending");
  if (!user.isActive) return loginRedirect("error=disabled");

  const token = await createSessionToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
  const res = NextResponse.redirect(new URL(safeNextPath(saved.next), origin));
  res.cookies.set(GOOGLE_OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** هوية Google مُتحقَّق منها لمستخدم جديد، تُحفظ بين العودة من Google وإدخال الاسم الكامل. */
export const GOOGLE_SIGNUP_COOKIE = "google_signup";
export const GOOGLE_SIGNUP_MAX_AGE_SECONDS = 60 * 30;

export interface GoogleSignupPayload {
  googleId: string;
  email: string;
}

export async function createGoogleSignupToken(payload: GoogleSignupPayload): Promise<string> {
  return new SignJWT({ ...payload, purpose: "google_signup" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_SIGNUP_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyGoogleSignupToken(token: string | undefined): Promise<GoogleSignupPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "google_signup" || typeof payload.googleId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { googleId: payload.googleId, email: payload.email };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/**
 * رموز موقّعة لغرض محدّد (تدفّق OAuth لخادم MCP): الحقل `purpose` يمنع استعمال
 * رمز مكان آخر — رمز الجلسة مثلاً بلا purpose فلا يُقبل هنا، ورموز OAuth تفتقد
 * حقول الجلسة فلا تُقبل جلسةً. `expiresIn` بصيغة jose (مثل "1h")، أو null لرمز بلا انتهاء.
 */
export async function signPurposeToken(
  purpose: string,
  claims: Record<string, unknown>,
  expiresIn: string | null,
  audience?: string,
): Promise<string> {
  const jwt = new SignJWT({ ...claims, purpose }).setProtectedHeader({ alg: "HS256" }).setIssuedAt();
  if (expiresIn) jwt.setExpirationTime(expiresIn);
  if (audience) jwt.setAudience(audience);
  return jwt.sign(secretKey());
}

export async function verifyPurposeToken(
  token: string,
  purpose: string,
  audience?: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), audience ? { audience } : {});
    return payload.purpose === purpose ? payload : null;
  } catch {
    return null;
  }
}

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
 * رمز وصول طويل الأمد لخادم MCP (‎/api/mcp) يحمل معرّف المستخدم فقط: الدور
 * وحالة الحساب يُقرآن من القاعدة عند كل طلب، فتعطيل الحساب أو تغيير دوره يسري
 * فوراً على الرمز. يُصدَر عبر `npm run mcp:token`.
 */
export const MCP_TOKEN_MAX_AGE_DAYS = 365;

export async function createMcpToken(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: "mcp" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MCP_TOKEN_MAX_AGE_DAYS}d`)
    .sign(secretKey());
}

export async function verifyMcpToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "mcp" || typeof payload.userId !== "string") return null;
    return payload.userId;
  } catch {
    return null;
  }
}

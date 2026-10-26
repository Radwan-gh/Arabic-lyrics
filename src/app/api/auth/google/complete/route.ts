import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { GOOGLE_SIGNUP_COOKIE, verifyGoogleSignupToken } from "@/lib/jwt";
import { fullNameError, normalizeFullName } from "@/lib/full-name";

const schema = z.object({ name: z.string() });

// الخطوة الأخيرة في التسجيل عبر Google: يكتب المستخدم اسمه الكامل، فيُنشأ
// حساب «قارئ» بانتظار موافقة الأدمن (لا تُنشأ جلسة).
export async function POST(req: Request) {
  const store = await cookies();
  const signup = await verifyGoogleSignupToken(store.get(GOOGLE_SIGNUP_COOKIE)?.value);
  if (!signup) {
    return NextResponse.json({ error: "انتهت صلاحية الطلب، يرجى المتابعة باستخدام Google من جديد" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const nameError = fullNameError(parsed.data.name);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId: signup.googleId }, { email: signup.email }] },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: normalizeFullName(parsed.data.name),
        email: signup.email,
        googleId: signup.googleId,
        role: "VIEWER",
        isApproved: false,
      },
    });
  }

  // إن وُجد حساب مسبقاً (إرسال مكرّر) فالطلب قائم أصلاً — نعيد النتيجة نفسها.
  const res = NextResponse.json({ ok: true, alreadyExists: !!existing });
  res.cookies.set(GOOGLE_SIGNUP_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

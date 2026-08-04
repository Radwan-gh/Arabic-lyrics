import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { lyrics: true } },
    },
  });

  return NextResponse.json({ users });
}

const createSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(80),
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(72),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("VIEWER"),
});

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { lyrics: true } },
    },
  });

  return NextResponse.json(user, { status: 201 });
}

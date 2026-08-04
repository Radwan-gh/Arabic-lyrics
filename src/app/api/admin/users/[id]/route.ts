import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(72).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const { role, isActive, password } = parsed.data;
  if (role === undefined && isActive === undefined && password === undefined) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  // Guard changes to the admin's own account: they may reset their own
  // password here, but not change their own role or deactivate themselves.
  if (id === session.userId && (role !== undefined || isActive !== undefined)) {
    return NextResponse.json({ error: "لا يمكنك تعديل صلاحيات حسابك الخاص من هنا" }, { status: 400 });
  }

  const data: { role?: typeof role; isActive?: boolean; passwordHash?: string } = {};
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password !== undefined) data.passwordHash = await hashPassword(password);

  const user = await prisma.user
    .update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    .catch(() => null);

  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك الخاص" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

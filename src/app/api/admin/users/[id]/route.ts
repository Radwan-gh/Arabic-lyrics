import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json({ error: "لا يمكنك تعديل صلاحيات حسابك الخاص من هنا" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || (!parsed.data.role && parsed.data.isActive === undefined)) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const user = await prisma.user
    .update({
      where: { id },
      data: parsed.data,
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

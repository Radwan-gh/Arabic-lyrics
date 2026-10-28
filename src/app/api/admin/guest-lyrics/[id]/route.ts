import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// اعتماد أنشودة زائر: تبقى منشورة كما هي، وتخرج من قائمة «أناشيد الزوار».
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const { count } = await prisma.lyrics.updateMany({
    where: { id, createdById: null },
    data: { reviewedAt: new Date() },
  });

  if (count === 0) {
    return NextResponse.json({ error: "الأنشودة غير موجودة" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

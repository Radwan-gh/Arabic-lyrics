import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.$queryRaw<{ tag: string }[]>`
    SELECT DISTINCT tag
    FROM "Lyrics", unnest(tags) AS tag
    ORDER BY tag ASC
  `;

  return NextResponse.json({ tags: rows.map((r) => r.tag) });
}

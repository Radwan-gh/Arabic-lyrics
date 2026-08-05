import { PrismaClient } from "@prisma/client";
import { normalizeArabicTitle } from "../src/lib/arabic";

/**
 * تعبئة عمود `titleNormalized` للسجلات التي ما زالت بقيمته الافتراضية الفارغة
 * (بعد إضافة العمود عبر `prisma db push`). idempotent — آمن لإعادة التشغيل.
 */
export async function backfillTitleNormalized(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.lyrics.findMany({
    where: { titleNormalized: "" },
    select: { id: true, title: true },
  });

  let updated = 0;
  for (const row of rows) {
    const titleNormalized = normalizeArabicTitle(row.title);
    if (!titleNormalized) continue; // لا شيء قابل للمطابقة — نتركه فارغاً.
    await prisma.lyrics.update({ where: { id: row.id }, data: { titleNormalized } });
    updated += 1;
  }

  console.log(`titleNormalized backfill: updated ${updated} of ${rows.length} row(s) with empty value`);
  return updated;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  backfillTitleNormalized(prisma)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

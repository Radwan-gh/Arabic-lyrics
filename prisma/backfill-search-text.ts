// تعبئة رجعية لعمودَي `searchText` و`titleNormalized` للأناشيد الموجودة.
// يُشغَّل بعد `prisma db push` الذي يضيف العمودين:
//   npx tsx prisma/backfill-search-text.ts
// افتراضيًا يعالج فقط الصفوف التي ما زال أحد العمودين فارغًا فيها (رخيص وآمن
// للتشغيل عند كل إقلاع). مرّر REBUILD_ALL=true لإعادة بناء كل الصفوف (مثلًا بعد
// تغيير منطق التطبيع).

import { PrismaClient } from "@prisma/client";
import { buildSearchText, normalizeArabic } from "../src/lib/arabic-search";

const BATCH_SIZE = 200;
const REBUILD_ALL = process.env.REBUILD_ALL === "true";

async function main() {
  const prisma = new PrismaClient();
  try {
    const where = REBUILD_ALL ? {} : { OR: [{ searchText: "" }, { titleNormalized: "" }] };
    const total = await prisma.lyrics.count({ where });
    if (total === 0) {
      console.log("لا توجد صفوف بحاجة إلى تعبئة searchText/titleNormalized.");
      return;
    }
    let processed = 0;
    let cursor: string | undefined;

    for (;;) {
      const batch = await prisma.lyrics.findMany({
        where,
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true, title: true, artist: true, album: true, content: true },
      });
      if (batch.length === 0) break;

      await prisma.$transaction(
        batch.map((row) =>
          prisma.lyrics.update({
            where: { id: row.id },
            data: {
              searchText: buildSearchText(row),
              titleNormalized: normalizeArabic(row.title),
            },
          }),
        ),
      );

      processed += batch.length;
      cursor = batch[batch.length - 1]!.id;
      console.log(`تمت معالجة ${processed}/${total}`);
    }

    console.log(`اكتمل: أُعيد بناء searchText و titleNormalized لـ ${processed} نشيدًا.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

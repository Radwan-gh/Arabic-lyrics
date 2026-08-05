import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedAnaasheed } from "./seed-anaasheed";
import { backfillTitleNormalized } from "./backfill-title-normalized";
import { normalizeArabicTitle } from "../src/lib/arabic";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "مدير النظام",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });

  const existingLyrics = await prisma.lyrics.count();
  if (existingLyrics === 0) {
    await prisma.lyrics.create({
      data: {
        title: "أغنية تجريبية",
        titleNormalized: normalizeArabicTitle("أغنية تجريبية"),
        artist: "فنان تجريبي",
        content:
          "هذا نص تجريبي لكلمات أغنية\nيمكنك تعديله أو حذفه لاحقاً\nمرحباً بك في منصة كلمات الأغاني العربية",
        tags: ["تجريبي"],
        createdById: admin.id,
      },
    });
  }

  // Seed the bundled أناشيد collection (idempotent — safe to re-run on every deploy).
  await seedAnaasheed(prisma);

  // تعبئة titleNormalized لأي سجلات قديمة أُضيفت قبل وجود العمود.
  await backfillTitleNormalized(prisma);

  console.log(`تم تجهيز قاعدة البيانات. حساب المدير: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

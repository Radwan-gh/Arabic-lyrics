import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedAnaasheed } from "./seed-anaasheed";
import { buildSearchText, normalizeArabic } from "../src/lib/arabic-search";

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
    const demo = {
      title: "أغنية تجريبية",
      artist: "فنان تجريبي",
      album: null,
      content:
        "هذا نص تجريبي لأنشودة\nيمكنك تعديله أو حذفه لاحقاً\nمرحباً بك في منصة الأناشيد العربية",
    };
    await prisma.lyrics.create({
      data: {
        ...demo,
        tags: ["تجريبي"],
        titleNormalized: normalizeArabic(demo.title),
        searchText: buildSearchText(demo),
        createdById: admin.id,
      },
    });
  }

  // Seed the bundled أناشيد collection (idempotent — safe to re-run on every deploy).
  await seedAnaasheed(prisma);

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

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";

type NasheedRecord = {
  title: string;
  artist: string | null;
  album: string;
  content: string;
  tags: string[];
};

function loadAnaasheed(): NasheedRecord[] {
  const file = path.join(__dirname, "data", "anaasheed.json");
  return JSON.parse(readFileSync(file, "utf8")) as NasheedRecord[];
}

async function resolveAdminId(prisma: PrismaClient): Promise<string | null> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const byEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (byEmail) return byEmail.id;
  const anyAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  return anyAdmin?.id ?? null;
}

// Insert the bundled أناشيد. Idempotent — safe to run on every deploy / seed.
export async function seedAnaasheed(prisma: PrismaClient): Promise<void> {
  const anaasheed = loadAnaasheed();
  const createdById = await resolveAdminId(prisma);

  // Idempotency: skip anaasheed already present, keyed by (title, maqam, lyrics).
  // Content is part of the key so that distinct anaasheed which happen to share a
  // title and maqam are both kept, while exact repeats and re-runs are skipped.
  const keyOf = (l: { title: string; album: string | null; content: string }) =>
    [l.title, l.album ?? "", l.content].join("");
  const existing = await prisma.lyrics.findMany({
    select: { title: true, album: true, content: true },
  });
  const seen = new Set(existing.map(keyOf));

  const toCreate: Prisma.LyricsCreateManyInput[] = [];
  for (const n of anaasheed) {
    const key = keyOf(n);
    if (seen.has(key)) continue;
    seen.add(key); // guard against exact duplicates within the data file itself
    toCreate.push({
      title: n.title,
      artist: n.artist,
      album: n.album,
      content: n.content,
      tags: n.tags,
      createdById,
    });
  }

  if (toCreate.length > 0) {
    await prisma.lyrics.createMany({ data: toCreate });
  }

  const skipped = anaasheed.length - toCreate.length;
  console.log(
    `أناشيد: inserted ${toCreate.length}, skipped ${skipped} (already present) — ` +
      `total in file: ${anaasheed.length}` +
      (createdById ? "" : " — no admin user found, records created without an owner"),
  );
}

// Run standalone when invoked directly (e.g. `npm run db:seed:anaasheed`).
if (require.main === module) {
  const prisma = new PrismaClient();
  seedAnaasheed(prisma)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

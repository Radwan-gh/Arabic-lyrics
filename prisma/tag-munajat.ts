// إضافة وسم «مناجاة» للأناشيد التي أغلب كلماتها مناجاة لله (خطاب مباشر: يا رب، إلهي،
// اللهم...). القائمة في prisma/data/munajat.json، صُنّفت بقراءة كلمات أناشيد المجموعة.
//
//   npm run db:tag-munajat            ← يضيف الوسم لكل نشيد في القائمة يفتقده
//   ONLY_IF_UNTAGGED=true npm run ... ← لا يفعل شيئًا إن كان الوسم مستخدمًا مسبقًا
//
// لا يُشغَّل عند الإقلاع: طُبِّق الوسم على قاعدة الإنتاج مباشرة عبر MCP. يبقى للقواعد
// المحلية أو المُنشأة قبل إضافة الوسم إلى anaasheed.json.
//
// المطابقة بالعنوان المُطبَّع + المقام (album). إن تشارك نشيدان العنوان والمقام في
// المجموعة واختلف تصنيفهما، تُضاف بصمة من بداية الكلمات للتمييز بينهما.
// التحديث عبر prisma.lyrics.update فيتغيّر updatedAt وتلتقطه مزامنة الأجهزة دون اتصال.

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { normalizeArabic, stripHtml } from "../src/lib/arabic-search";

const TAG = "مناجاة";

type MunajatEntry = { title: string; album: string | null; contentStart?: string };

function load(): MunajatEntry[] {
  const file = path.join(__dirname, "data", "munajat.json");
  return JSON.parse(readFileSync(file, "utf8")) as MunajatEntry[];
}

const keyOf = (title: string, album: string | null) => `${normalizeArabic(title)}|${album ?? ""}`;
const contentKey = (content: string) => normalizeArabic(stripHtml(content)).slice(0, 60);

async function main() {
  const prisma = new PrismaClient();
  try {
    if (process.env.ONLY_IF_UNTAGGED === "true") {
      const already = await prisma.lyrics.count({ where: { tags: { has: TAG } } });
      if (already > 0) {
        console.log(`وسم «${TAG}» مستخدم مسبقًا (${already}) — لا تعديل.`);
        return;
      }
    }

    const entries = load();
    const wanted = new Map<string, MunajatEntry[]>();
    for (const e of entries) {
      const k = keyOf(e.title, e.album);
      wanted.set(k, [...(wanted.get(k) ?? []), e]);
    }

    const rows = await prisma.lyrics.findMany({
      select: { id: true, title: true, album: true, content: true, tags: true },
    });

    const toTag: { id: string; tags: string[] }[] = [];
    const matchedKeys = new Set<string>();
    for (const row of rows) {
      const k = keyOf(row.title, row.album);
      const list = wanted.get(k);
      if (!list) continue;
      const needsContent = list.some((e) => e.contentStart);
      if (needsContent) {
        const ck = contentKey(row.content);
        if (!list.some((e) => e.contentStart && ck.startsWith(normalizeArabic(e.contentStart)))) continue;
      }
      matchedKeys.add(k);
      if (!row.tags.includes(TAG)) toTag.push({ id: row.id, tags: [...row.tags, TAG] });
    }

    for (let i = 0; i < toTag.length; i += 100) {
      const batch = toTag.slice(i, i + 100);
      await prisma.$transaction(
        batch.map((r) => prisma.lyrics.update({ where: { id: r.id }, data: { tags: r.tags } })),
      );
    }

    const missing = [...wanted.keys()].filter((k) => !matchedKeys.has(k));
    console.log(
      `مناجاة: أُضيف الوسم إلى ${toTag.length} نشيدًا — القائمة ${entries.length}` +
        (missing.length ? ` — غير موجودة في القاعدة: ${missing.length} (${missing.join("، ")})` : ""),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

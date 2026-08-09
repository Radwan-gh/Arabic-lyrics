/**
 * Diagnostic/cleanup for stray inline formatting in saved lyrics.
 *
 * Older editor versions could bake <strong>/<em>/<u> (and <b>/<i>) tags into
 * stored `content`. Those make words render bold/italic/underlined regardless
 * of which editor is deployed now — it is data, not the editor.
 *
 *   npx tsx prisma/scan-lyrics-formatting.ts           # dry run: report only
 *   npx tsx prisma/scan-lyrics-formatting.ts --apply   # strip the tags in place
 *
 * --apply unwraps the formatting tags (keeps the text, drops bold/italic/
 * underline) and leaves paragraphs/line breaks untouched.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FORMAT_TAG_RE = /<\/?(strong|b|em|i|u)\b[^>]*>/gi;
const HAS_FORMAT_RE = /<(strong|b|em|i|u)\b[^>]*>/i;

async function main() {
  const apply = process.argv.includes("--apply");
  const all = await prisma.lyrics.findMany({ select: { id: true, title: true, content: true } });
  const affected = all.filter((l) => HAS_FORMAT_RE.test(l.content));

  console.log(`Scanned ${all.length} lyrics — ${affected.length} contain inline formatting tags.`);

  for (const l of affected.slice(0, 10)) {
    const tags = (l.content.match(FORMAT_TAG_RE) ?? []).slice(0, 8).join(" ");
    console.log(`  • ${l.id}  "${l.title}"  →  ${tags}`);
  }
  if (affected.length > 10) console.log(`  … and ${affected.length - 10} more.`);

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to strip these tags.");
    return;
  }

  let updated = 0;
  for (const l of affected) {
    const cleaned = l.content.replace(FORMAT_TAG_RE, "");
    if (cleaned !== l.content) {
      await prisma.lyrics.update({ where: { id: l.id }, data: { content: cleaned } });
      updated++;
    }
  }
  console.log(`\nStripped formatting tags from ${updated} lyrics.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

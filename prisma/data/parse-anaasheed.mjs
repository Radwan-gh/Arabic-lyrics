// Generator: parse the أناشيد source text into structured Lyrics records.
//
// Reads prisma/data/anaasheed-source.txt (UTF-8, LF) and writes
// prisma/data/anaasheed.json — an array of { title, artist, album, content, tags }.
//
// Run with: node prisma/data/parse-anaasheed.mjs
//
// Each nasheed in the source follows: a مقام header, a title, optional metadata
// lines (الوزن / كلمات / ألحان / …), then the lyrics verses. See the parsing rules
// documented in the seeding plan for details.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "anaasheed-source.txt");
const OUT = path.join(__dirname, "anaasheed.json");

// Known maqamat, longest-first so multi-word names match before their prefixes.
const KNOWN_MAQAMS = [
  "البيات الشوري",
  "حجازكار كرد",
  "الجهاركاه",
  "حجازكار",
  "الزنجران",
  "النهوند",
  "النكريز",
  "الرست",
  "السيكا",
  "الحجاز",
  "البيات",
  "الصبا",
  "الكردي",
  "الكرد",
  "العجم",
  "الامي",
  "اليكاه",
];

// Escape text before wrapping it in <p> tags. The source contains no markup, and
// the app re-sanitizes on render (src/lib/sanitize-lyrics.ts), so this only guards
// against stray angle brackets / ampersands producing invalid HTML.
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Classify a line as metadata (attribution / rhythm annotation) rather than lyrics.
// Metadata lines start with a key word (كلمات / شعر / ألحان / لحن / الوزن / …) followed
// by the value; the separator may be «:», «/», or nothing at all («الشعر قديم»,
// «ألحان منذر سرميني»). Returns { type, value } or null (= a lyric line).
// NB: JS `\b` word boundaries do not work around Arabic letters (they aren't `\w`),
// so keys are matched as explicit leading alternatives instead.
const KEY_RE =
  /^(?<combo>كلمات\s*و?\s*ألحان|كلمات\s*و?\s*لحن|شعر\s*و?\s*لحن|الشعر\s*و?\s*اللحن)|^(?<wazn>الوزن|وزن|على\s*وزن|وحدة|الأساسي)|^(?<alhan>الألحان|ألحان|الحان|ألحـان|ألحانْ|اللحن|لحن)|^(?<kalimat>كلمات|كلمة|الشعر|شعر)/u;

function classifyMeta(line) {
  const t = line.trim();
  if (!t) return null;

  // «خانة / الخانة» annotations (e.g. «الخانة للشيخ حسن المملوك») are dropped entirely.
  if (/^(الخانة|خانة)(\s|$|[:\/])/.test(t)) return { type: "khana", value: "" };

  const m = t.match(KEY_RE);
  if (!m) return null;

  const key = m[0];
  let rest = t.slice(key.length);
  const hadSep = /^\s*[:\/]/.test(rest);
  rest = rest.replace(/^\s*[:\/]?\s*/, "").trim();

  // Guard: without an explicit separator, only short lines are metadata — a long line
  // that merely happens to open with one of these words is a lyric verse, kept as-is.
  if (!hadSep && t.length > 45) return null;

  const g = m.groups;
  if (g.combo) return { type: "kalimatWaAlhan", value: rest };
  if (g.wazn) return { type: "wazn", value: rest };
  if (g.alhan) return { type: "alhan", value: rest };
  if (g.kalimat) return { type: "kalimat", value: rest };
  return null;
}

function normalizeSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

function parse() {
  const raw = fs.readFileSync(SRC, "utf8").replace(/\r\n?/g, "\n");
  const lines = raw.split("\n");

  // Header = a line starting with مقام that is preceded by a blank line (or is first).
  const headerIdx = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("مقام") && (i === 0 || lines[i - 1].trim() === "")) {
      headerIdx.push(i);
    }
  }

  const records = [];
  for (let b = 0; b < headerIdx.length; b++) {
    const start = headerIdx[b];
    const end = b + 1 < headerIdx.length ? headerIdx[b + 1] : lines.length;
    const body = lines.slice(start, end);

    // Header line → maqam. Strip the leading «مقام» (collapse the doubled «مقام مقام …»).
    let header = body[0].trim();
    header = header.replace(/^مقام\s+/, "").replace(/^مقام\s+/, "").trim();

    let maqam = null;
    let mergedTitle = "";
    for (const k of KNOWN_MAQAMS) {
      if (header === k) {
        maqam = k;
        break;
      }
      if (header.startsWith(k + " ")) {
        maqam = k;
        mergedTitle = header.slice(k.length).trim();
        break;
      }
    }
    if (!maqam) {
      // Fall back to the first word (should not happen for the known set).
      maqam = header.split(/\s+/)[0] || "";
      mergedTitle = header.slice(maqam.length).trim();
    }

    // Remaining lines after the header.
    let rest = body.slice(1);
    while (rest.length && rest[0].trim() === "") rest.shift();

    // Title: the merged remainder, else the first non-blank line.
    let title = mergedTitle;
    if (!title) title = (rest.shift() || "").trim();

    // Split the rest into metadata and lyrics.
    let wazn = "";
    let kalimat = "";
    let alhan = "";
    let kalimatWaAlhan = "";
    const lyric = [];
    for (const line of rest) {
      if (line.trim() === "") {
        lyric.push("");
        continue;
      }
      const meta = classifyMeta(line);
      if (meta) {
        if (meta.type === "wazn") {
          if (meta.value && !wazn) wazn = meta.value;
        } else if (meta.type === "kalimatWaAlhan") {
          if (meta.value) kalimatWaAlhan = meta.value;
        } else if (meta.type === "alhan") {
          if (meta.value && !alhan) alhan = meta.value;
        } else if (meta.type === "kalimat") {
          if (meta.value && !kalimat) kalimat = meta.value;
        }
        // «خانة/قصيدة/تخميسة» annotations are dropped from the clean lyrics.
        continue;
      }
      lyric.push(line.replace(/\s+$/, ""));
    }

    // Lyric verses (hemistichs), blank lines removed.
    const verses = lyric.map((l) => l.trim()).filter((l) => l !== "");

    // Drop spurious empty blocks (e.g. a lone maqam header with no lyrics).
    if (verses.length === 0) continue;

    // Backfill a missing title from the first verse.
    if (!title) title = verses[0];

    // Build attribution (artist).
    let artist = "";
    if (kalimatWaAlhan) {
      artist = `كلمات وألحان: ${kalimatWaAlhan}`;
    } else {
      const parts = [];
      if (kalimat) parts.push(`كلمات: ${kalimat}`);
      if (alhan) parts.push(`ألحان: ${alhan}`);
      artist = parts.join(" · ");
    }
    artist = normalizeSpaces(artist).slice(0, 200);

    // Tags: maqam name, «نشيد», optional wazn (≤30 chars). Deduped, capped at 10.
    const maqamTag = normalizeSpaces(maqam);
    const tags = [];
    const pushTag = (t) => {
      const v = normalizeSpaces(t);
      if (v && v.length <= 30 && !tags.includes(v) && tags.length < 10) tags.push(v);
    };
    pushTag(maqamTag);
    pushTag("نشيد");
    if (wazn) pushTag(wazn);

    // Content: most anaasheed are قصائد whose بيت is two hemistichs, one per source
    // line. Present them as couplets — insert a blank line after every two verses.
    const htmlParts = [];
    for (let i = 0; i < verses.length; i++) {
      htmlParts.push(`<p>${escapeHtml(verses[i])}</p>`);
      if (i % 2 === 1 && i !== verses.length - 1) htmlParts.push("<p><br></p>");
    }
    const content = htmlParts.join("");

    records.push({
      title: normalizeSpaces(title).slice(0, 200),
      artist: artist || null,
      album: `مقام ${maqamTag}`.slice(0, 200),
      content,
      tags,
    });
  }

  return records;
}

const records = parse();

// Validation.
const problems = [];
if (records.some((r) => !r.title)) problems.push("empty title present");
if (records.some((r) => !r.content)) problems.push("empty content present");
if (records.some((r) => !r.tags[0])) problems.push("empty maqam tag present");
if (problems.length) {
  console.error("VALIDATION FAILED:", problems.join("; "));
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(records, null, 2) + "\n", "utf8");
console.log(`Wrote ${records.length} anaasheed to ${path.relative(process.cwd(), OUT)}`);
console.log("Sample titles:", records.slice(0, 3).map((r) => r.title).join(" | "));

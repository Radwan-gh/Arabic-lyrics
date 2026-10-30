import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildLyricsWhere, buildLyricsOrderBy, LYRICS_PAGE_SIZE } from "@/lib/lyrics-search";
import { buildLyricsWriteData, findDuplicateLyrics, getLyrics } from "@/lib/lyrics";
import { htmlToPlainText, lyricsTextToHtml, toEditableHtml } from "@/lib/lyrics-content";
import { canModifyLyrics } from "@/lib/lyrics-permissions";
import { getTagCounts } from "@/lib/tags";
import { appendToPlaylist } from "@/lib/playlists";

/** صاحب الرمز بعد التحقق منه وقراءة دوره الحالي من القاعدة؛ null للزائر المجهول. */
export interface McpUser {
  userId: string;
  name: string;
  role: Role;
}

// قيود الحقول نفسها في مسارات ‎/api/lyrics.
const titleField = z.string().trim().min(1).max(200);
const optionalTextField = z.string().trim().max(200);
const textField = z
  .string()
  .min(1)
  .max(20000)
  .describe("Lyrics as plain text, one verse line per line; blank line between stanzas. *bold* and _italic_ markers are supported.");
const tagsField = z.array(z.string().trim().min(1).max(30)).max(10);

function json(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string, extra?: Record<string, unknown>): CallToolResult {
  return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: message, ...extra }, null, 2) }] };
}

const NEEDS_TOKEN = "This tool needs an MCP access token (Authorization: Bearer <token>). Ask an admin to run `npm run mcp:token`.";

/**
 * يبني خادم MCP لطلب واحد (وضع stateless): الأدوات تغلق على هوية صاحب الطلب،
 * فلا تُشارَك حالة بين الطلبات. القراءة مفتوحة كما في الواجهة (كل الأناشيد ظاهرة
 * للجميع)، والكتابة تتطلّب رمزاً وتطبّق قواعد الأدوار نفسها في canModifyLyrics.
 */
export function buildMcpServer(user: McpUser | null, origin: string): McpServer {
  const server = new McpServer(
    { name: "nafahat", version: "1.0.0" },
    {
      instructions:
        "نفحات (Nafahat): an Arabic nasheed/lyrics library. Search is diacritics-insensitive and normalizes Arabic letter forms. " +
        "Use search_lyrics to find IDs, then get_lyrics for the full text. Before add_lyrics, search first to avoid duplicates. " +
        "A 'وصلة' is a user's playlist of nasheeds for a performance." +
        (user ? ` Signed in as ${user.name} (${user.role}).` : " Anonymous: read-only tools only."),
    },
  );

  const lyricsUrl = (id: string) => `${origin}/lyrics/${id}`;

  server.registerTool(
    "search_lyrics",
    {
      title: "Search lyrics",
      description:
        "Search nasheeds by words from the title, munshid (artist), maqam (album) or lyrics text. Returns up to 50 results per page.",
      inputSchema: {
        query: z.string().max(200).optional().describe("Search text; empty lists everything."),
        tags: tagsField.optional().describe("Only nasheeds having any of these tags."),
        sort: z.enum(["title_asc", "title_desc", "date_desc", "date_asc"]).optional().describe("Default: date_desc."),
        page: z.number().int().min(1).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query = "", tags = [], sort = "date_desc", page = 1 }) => {
      const where = buildLyricsWhere(query.trim(), tags);
      const [rows, total] = await Promise.all([
        prisma.lyrics.findMany({
          where,
          orderBy: buildLyricsOrderBy(sort),
          skip: (page - 1) * LYRICS_PAGE_SIZE,
          take: LYRICS_PAGE_SIZE,
          select: { id: true, title: true, artist: true, album: true, tags: true },
        }),
        prisma.lyrics.count({ where }),
      ]);
      return json({
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / LYRICS_PAGE_SIZE)),
        items: rows.map((r) => ({ ...r, url: lyricsUrl(r.id) })),
      });
    },
  );

  server.registerTool(
    "get_lyrics",
    {
      title: "Get lyrics",
      description: "Full text and details of one nasheed by ID.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const lyrics = await getLyrics(id);
      if (!lyrics) return fail("الأنشودة غير موجودة");
      return json({
        id: lyrics.id,
        title: lyrics.title,
        artist: lyrics.artist,
        album: lyrics.album,
        tags: lyrics.tags,
        text: htmlToPlainText(lyrics.content),
        createdBy: lyrics.createdBy?.name ?? null,
        canEdit: canModifyLyrics(user, lyrics.createdById),
        updatedAt: lyrics.updatedAt.toISOString(),
        url: lyricsUrl(lyrics.id),
      });
    },
  );

  server.registerTool(
    "list_tags",
    {
      title: "List tags",
      description: "All tags with how many nasheeds use each, most used first.",
      annotations: { readOnlyHint: true },
    },
    async () => json({ tags: await getTagCounts() }),
  );

  server.registerTool(
    "add_lyrics",
    {
      title: "Add lyrics",
      description:
        "Add a new nasheed (Editor or Admin token required). Fails with the matching nasheeds if one with the same title exists, unless allowDuplicate is true.",
      inputSchema: {
        title: titleField,
        artist: optionalTextField.optional().describe("Munshid / performer."),
        album: optionalTextField.optional().describe("Maqam."),
        text: textField,
        tags: tagsField.optional(),
        allowDuplicate: z.boolean().optional(),
      },
    },
    async ({ text, allowDuplicate, ...fields }) => {
      if (!user) return fail(NEEDS_TOKEN);
      if (user.role !== "ADMIN" && user.role !== "EDITOR") return fail("إضافة الأناشيد متاحة للمحرّر والمدير فقط");

      const data = buildLyricsWriteData({ ...fields, content: lyricsTextToHtml(text) });
      if (!data) return fail("نص الأنشودة مطلوب");

      if (!allowDuplicate) {
        const duplicates = await findDuplicateLyrics(fields.title);
        if (duplicates.length > 0) return fail("يوجد نشيد بنفس العنوان مسبقاً", { duplicates });
      }

      const lyrics = await prisma.lyrics.create({ data: { ...data, createdById: user.userId }, select: { id: true } });
      return json({ id: lyrics.id, url: lyricsUrl(lyrics.id) });
    },
  );

  server.registerTool(
    "update_lyrics",
    {
      title: "Update lyrics",
      description:
        "Edit a nasheed; omitted fields keep their current value, an empty string clears artist/album. Admins can edit any nasheed, Editors only their own.",
      inputSchema: {
        id: z.string().min(1),
        title: titleField.optional(),
        artist: optionalTextField.optional(),
        album: optionalTextField.optional(),
        text: textField.optional(),
        tags: tagsField.optional().describe("Replaces all tags."),
        allowDuplicate: z.boolean().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ id, text, allowDuplicate, ...fields }) => {
      if (!user) return fail(NEEDS_TOKEN);

      const existing = await prisma.lyrics.findUnique({ where: { id } });
      if (!existing) return fail("الأنشودة غير موجودة");
      if (!canModifyLyrics(user, existing.createdById)) return fail("غير مصرح لك بتعديل هذه الأنشودة");

      const title = fields.title ?? existing.title;
      const data = buildLyricsWriteData({
        title,
        artist: fields.artist ?? existing.artist ?? undefined,
        album: fields.album ?? existing.album ?? undefined,
        content: text !== undefined ? lyricsTextToHtml(text) : toEditableHtml(existing.content),
        tags: fields.tags ?? existing.tags,
      });
      if (!data) return fail("نص الأنشودة مطلوب");

      if (!allowDuplicate && fields.title !== undefined) {
        const duplicates = await findDuplicateLyrics(title, id);
        if (duplicates.length > 0) return fail("يوجد نشيد بنفس العنوان مسبقاً", { duplicates });
      }

      await prisma.lyrics.update({ where: { id }, data });
      return json({ id, url: lyricsUrl(id) });
    },
  );

  server.registerTool(
    "list_my_playlists",
    {
      title: "List my playlists",
      description: "The token owner's playlists (وصلات) with their item counts.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      if (!user) return fail(NEEDS_TOKEN);
      const playlists = await prisma.playlist.findMany({
        where: { ownerId: user.userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, isPublic: true, _count: { select: { items: true } } },
      });
      return json({
        playlists: playlists.map(({ _count, ...p }) => ({ ...p, itemCount: _count.items })),
      });
    },
  );

  server.registerTool(
    "get_playlist",
    {
      title: "Get playlist",
      description: "A playlist's nasheeds in order. Works for your own playlists and for public ones.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const playlist = await prisma.playlist.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { position: "asc" },
            include: { lyrics: { select: { id: true, title: true, artist: true, album: true } } },
          },
        },
      });
      if (!playlist || (!playlist.isPublic && playlist.ownerId !== user?.userId)) return fail("الوصلة غير موجودة");
      return json({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        isPublic: playlist.isPublic,
        items: playlist.items.map((item) => item.lyrics),
      });
    },
  );

  server.registerTool(
    "create_playlist",
    {
      title: "Create playlist",
      description: "Create a new private playlist (وصلة) owned by the token owner.",
      inputSchema: {
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).optional(),
      },
    },
    async ({ title, description }) => {
      if (!user) return fail(NEEDS_TOKEN);
      const playlist = await prisma.playlist.create({
        data: { title, description: description || null, ownerId: user.userId },
        select: { id: true, title: true },
      });
      return json(playlist);
    },
  );

  server.registerTool(
    "add_to_playlist",
    {
      title: "Add to playlist",
      description: "Append nasheeds to the end of one of your playlists, in the given order. Already-present ones are skipped.",
      inputSchema: {
        playlistId: z.string().min(1),
        lyricsIds: z.array(z.string().min(1)).min(1).max(50),
      },
      annotations: { idempotentHint: true },
    },
    async ({ playlistId, lyricsIds }) => {
      if (!user) return fail(NEEDS_TOKEN);
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId }, select: { ownerId: true } });
      if (!playlist || playlist.ownerId !== user.userId) return fail("الوصلة غير موجودة");

      const found = await prisma.lyrics.findMany({ where: { id: { in: lyricsIds } }, select: { id: true } });
      const foundIds = new Set(found.map((l) => l.id));

      const added: string[] = [];
      const skipped: string[] = [];
      for (const lyricsId of lyricsIds) {
        if (foundIds.has(lyricsId) && (await appendToPlaylist(playlistId, lyricsId))) added.push(lyricsId);
        else skipped.push(lyricsId);
      }
      return json({ added, skipped });
    },
  );

  return server;
}

// يُصدر رمز وصول لخادم MCP (‎/api/mcp) باسم مستخدم موجود ومفعّل:
//   npm run mcp:token -- user@example.com
// يحتاج DATABASE_URL وJWT_SECRET نفسَيهما المستخدمَين في الخادم. الرمز صالح سنة؛
// لإبطاله عطّل الحساب أو غيّر دوره (يُقرأ من القاعدة عند كل طلب)، أو غيّر
// JWT_SECRET لإبطال كل الرموز (يُخرج كل المستخدمين أيضاً).

import { PrismaClient } from "@prisma/client";
import { createMcpToken, MCP_TOKEN_MAX_AGE_DAYS } from "../src/lib/jwt";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("الاستخدام: npm run mcp:token -- user@example.com");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, isActive: true, isApproved: true },
    });
    if (!user) throw new Error(`لا يوجد مستخدم بالبريد ${email}`);
    if (!user.isActive || !user.isApproved) throw new Error("الحساب غير مفعّل أو بانتظار الموافقة");

    const token = await createMcpToken(user.id);
    console.error(`رمز MCP لـ ${user.name} (${user.role}) — صالح ${MCP_TOKEN_MAX_AGE_DAYS} يوماً:`);
    console.log(token);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

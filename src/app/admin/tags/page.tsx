import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TagTable } from "@/components/TagTable";

export default async function AdminTagsPage() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") redirect("/");

  const tags = await prisma.$queryRaw<{ tag: string; count: number }[]>`
    SELECT tag, COUNT(*)::int AS count
    FROM "Lyrics", unnest(tags) AS tag
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">إدارة الوسوم</h1>
      <TagTable initialTags={tags} />
    </div>
  );
}

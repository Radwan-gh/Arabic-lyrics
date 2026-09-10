import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTagCounts } from "@/lib/tags";
import { TagTable } from "@/components/TagTable";
import { AdminTagsScreen } from "@/components/AdminTagsScreen";

export default async function AdminTagsPage() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") redirect("/");

  const tags = await getTagCounts();

  return (
    <>
      <div className="sm:hidden">
        <AdminTagsScreen initialTags={tags} />
      </div>
      <div className="hidden sm:block">
        <h1 className="mb-4 text-xl font-bold">إدارة الوسوم</h1>
        <TagTable initialTags={tags} />
      </div>
    </>
  );
}

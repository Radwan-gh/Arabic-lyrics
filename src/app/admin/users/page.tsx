import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UserTable } from "@/components/UserTable";

export default async function AdminUsersPage() {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { lyrics: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">إدارة المستخدمين</h1>
      <UserTable initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}

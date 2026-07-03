import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { LyricsForm } from "@/components/LyricsForm";

export default async function EditLyricsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lyrics, session] = await Promise.all([prisma.lyrics.findUnique({ where: { id } }), getCurrentUser()]);

  if (!lyrics) notFound();

  const canModify =
    !!session && (session.role === "ADMIN" || (session.role === "EDITOR" && session.userId === lyrics.createdById));
  if (!canModify) redirect(`/lyrics/${id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">تعديل الكلمات</h1>
      <LyricsForm
        mode="edit"
        lyricsId={lyrics.id}
        initialValues={{
          title: lyrics.title,
          artist: lyrics.artist ?? "",
          album: lyrics.album ?? "",
          content: lyrics.content,
          tags: lyrics.tags.join(", "),
        }}
      />
    </div>
  );
}

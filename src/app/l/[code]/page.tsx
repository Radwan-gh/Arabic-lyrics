import { notFound, permanentRedirect } from "next/navigation";
import { getLyricsIdByShortId } from "@/lib/lyrics";

// رابط المشاركة القصير: ‎/l/<shortId>‎ يحوِّل إلى صفحة النشيد ‎/lyrics/<id>‎.
export default async function ShortLyricsLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const id = await getLyricsIdByShortId(code);
  if (!id) notFound();
  permanentRedirect(`/lyrics/${id}`);
}

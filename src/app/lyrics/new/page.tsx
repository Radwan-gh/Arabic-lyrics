import { LyricsForm } from "@/components/LyricsForm";

export default function NewLyricsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">إضافة أنشودة جديدة</h1>
      <LyricsForm mode="create" />
    </div>
  );
}

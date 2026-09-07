import { LyricsForm } from "@/components/LyricsForm";

export default function NewLyricsPage() {
  return (
    <div className="sm:mx-auto sm:max-w-2xl">
      <h1 className="mb-4 hidden text-xl font-bold sm:block">إضافة أنشودة جديدة</h1>
      <LyricsForm mode="create" />
    </div>
  );
}

"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { lyricsProseCls } from "@/lib/lyrics-prose";

export function RichTextEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      Underline,
    ],
    content,
    editorProps: {
      attributes: {
        dir: "rtl",
        class: `min-h-[12rem] rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-100 ${lyricsProseCls}`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return <div className="min-h-[12rem] rounded-lg border border-neutral-300 bg-neutral-50" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btnCls = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm font-medium ${
      active
        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
        : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
    }`;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        className={btnCls(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        غامق
      </button>
      <button
        type="button"
        className={btnCls(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        مائل
      </button>
      <button
        type="button"
        className={btnCls(editor.isActive("underline"))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        تسطير
      </button>
    </div>
  );
}

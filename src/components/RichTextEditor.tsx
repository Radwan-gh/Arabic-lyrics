"use client";

import { useEffect, useRef, useState } from "react";

type Command = "bold" | "italic" | "underline";

const TOOLBAR: { cmd: Command; label: string; title: string; style: string }[] = [
  { cmd: "bold", label: "B", title: "غامق (Ctrl+B)", style: "font-bold" },
  { cmd: "italic", label: "I", title: "مائل (Ctrl+I)", style: "italic" },
  { cmd: "underline", label: "U", title: "تحته خط (Ctrl+U)", style: "underline" },
];

/**
 * Lightweight, dependency-free rich text editor for Arabic (RTL) lyrics.
 *
 * Supports exactly the formatting the sanitizer whitelists (bold / italic /
 * underline + paragraphs), emits HTML built from <p>, <br>, <strong>, <em>,
 * <u>, and is uncontrolled: `content` seeds the initial value only.
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = "اكتب كلمات الأنشودة هنا…",
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [active, setActive] = useState<Record<Command, boolean>>({
    bold: false,
    italic: false,
    underline: false,
  });

  // Seed the initial value once — uncontrolled editor, so `content` is
  // intentionally not a dependency.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Make Enter produce <p> (not <div>) so the output stays inside the
    // sanitizer whitelist and line breaks survive round-tripping.
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // No-op on browsers that don't support the query.
    }
    el.innerHTML = content?.trim() ? content : "<p><br></p>";
    updateEmpty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateEmpty() {
    const el = editorRef.current;
    if (el) el.dataset.empty = el.textContent?.trim() ? "false" : "true";
  }

  function emitChange() {
    updateEmpty();
    onChangeRef.current(editorRef.current?.innerHTML ?? "");
  }

  function exec(cmd: Command) {
    // Keep focus without scrolling the button/editor into view.
    editorRef.current?.focus({ preventScroll: true });
    document.execCommand(cmd);
    setActive((prev) => ({ ...prev, [cmd]: !prev[cmd] }));
    emitChange();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white transition-colors focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
      <div
        role="toolbar"
        aria-label="أدوات التنسيق"
        className="flex items-center gap-1 border-b border-neutral-200 bg-neutral-50 p-1.5"
      >
        {TOOLBAR.map(({ cmd, label, title, style }) => (
          <button
            key={cmd}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active[cmd]}
            // Keep the current selection when the button takes focus.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(cmd)}
            className={`flex h-10 w-10 items-center justify-center rounded-md text-base transition-colors ${style} ${
              active[cmd]
                ? "bg-emerald-100 text-emerald-800"
                : "text-neutral-600 hover:bg-neutral-200/70"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        dir="rtl"
        role="textbox"
        aria-multiline="true"
        aria-label="نص الأنشودة"
        suppressContentEditableWarning
        onInput={emitChange}
        data-placeholder={placeholder}
        className="lyrics-editor min-h-[12rem] px-3 py-2.5 text-base leading-loose text-neutral-900 focus:outline-none [&_em]:italic [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_u]:underline"
      />
    </div>
  );
}

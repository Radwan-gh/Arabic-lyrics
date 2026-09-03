"use client";

import { useEffect, useRef, useState } from "react";
import { htmlToPlainText, legacyPlainTextToHtml } from "@/lib/lyrics-content";

/**
 * A deliberately simple, mobile-first lyrics editor: one auto-growing RTL
 * `<textarea>` and nothing else. It replaces the previous rich-text editor.
 *
 * The public interface matches the old editor — `content` comes in as stored
 * HTML (or legacy plain text) and `onChange` emits HTML — so the surrounding
 * form and the render/sanitize pipeline stay unchanged. Internally we edit
 * plain text and convert to `<p>` HTML on every change.
 */
export function LyricsTextEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const [text, setText] = useState(() => htmlToPlainText(content));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  // Size to the initial content and normalise what's stored to the plain-text
  // form the user actually sees, so "save without editing" keeps them in sync.
  useEffect(() => {
    autoGrow();
    onChangeRef.current(legacyPlainTextToHtml(text));
    // Run once on mount; `text`/`onChange` are intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <textarea
      ref={textareaRef}
      dir="rtl"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        onChange(legacyPlainTextToHtml(next));
        autoGrow();
      }}
      rows={10}
      placeholder="اكتب كلمات الأنشودة هنا، سطراً بسطر..."
      aria-label="كلمات الأنشودة"
      className="w-full min-h-[16rem] resize-none overflow-hidden rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base leading-loose text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
    />
  );
}

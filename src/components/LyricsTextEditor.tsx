"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic } from "lucide-react";
import { htmlToPlainText, lyricsTextToHtml } from "@/lib/lyrics-content";

/**
 * A deliberately simple, mobile-first lyrics editor: one auto-growing RTL
 * `<textarea>` plus a two-button formatting bar (bold / italic). It replaces
 * the previous rich-text editor.
 *
 * The public interface matches the old editor — `content` comes in as stored
 * HTML (or legacy plain text) and `onChange` emits HTML — so the surrounding
 * form and the render/sanitize pipeline stay unchanged. Internally we edit
 * plain text that uses the app's WhatsApp-style markers (`*bold*`, `_italic_`)
 * and convert to `<p>` HTML on every change.
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
  // Selection to restore after a formatting-button edit re-renders the textarea.
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function update(next: string) {
    setText(next);
    onChangeRef.current(lyricsTextToHtml(next));
  }

  // Size to the initial content and normalise what's stored to the plain-text
  // form the user actually sees, so "save without editing" keeps them in sync.
  useEffect(() => {
    autoGrow();
    onChangeRef.current(lyricsTextToHtml(text));
    // Run once on mount; deps intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a formatting edit changes the text, restore focus + selection so the
  // user can keep typing right where they were.
  useEffect(() => {
    const sel = pendingSelection.current;
    if (!sel || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(sel.start, sel.end);
    pendingSelection.current = null;
    autoGrow();
  }, [text]);

  /** Wrap (or unwrap) the current selection with a single-char marker. */
  function toggleMarker(marker: "*" | "_") {
    const el = textareaRef.current;
    if (!el) return;

    const { selectionStart: start, selectionEnd: end, value } = el;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    const wrappedOutside = before.endsWith(marker) && after.startsWith(marker);
    const wrappedInside =
      selected.length >= 2 && selected.startsWith(marker) && selected.endsWith(marker);

    if (wrappedOutside) {
      update(before.slice(0, -1) + selected + after.slice(1));
      pendingSelection.current = { start: start - 1, end: end - 1 };
    } else if (wrappedInside) {
      const inner = selected.slice(1, -1);
      update(before + inner + after);
      pendingSelection.current = { start, end: end - 2 };
    } else {
      update(before + marker + selected + marker + after);
      // Keep the selection over the text, now sitting inside the markers.
      pendingSelection.current = { start: start + 1, end: end + 1 };
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ToolbarButton label="عريض" onClick={() => toggleMarker("*")}>
          <Bold className="h-5 w-5" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="مائل" onClick={() => toggleMarker("_")}>
          <Italic className="h-5 w-5" aria-hidden="true" />
        </ToolbarButton>
        <p className="ms-1 text-xs text-neutral-400">
          حدّد النص ثم اضغط على الزر لتنسيقه
        </p>
      </div>

      <textarea
        ref={textareaRef}
        dir="rtl"
        value={text}
        onChange={(e) => {
          update(e.target.value);
          autoGrow();
        }}
        rows={10}
        placeholder="اكتب كلمات الأنشودة هنا، سطراً بسطر..."
        aria-label="كلمات الأنشودة"
        className="w-full min-h-[16rem] resize-none overflow-hidden rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base leading-loose text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Prevent the textarea from losing focus/selection when the button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      {children}
    </button>
  );
}

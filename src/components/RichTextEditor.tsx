"use client";

import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

export function RichTextEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const quill = new Quill(containerRef.current, {
      theme: "snow",
      modules: {
        // No toolbar: the editor is plain multi-line text only.
        toolbar: false,
      },
      // Empty whitelist => Quill strips every inline format (bold/italic/
      // underline/etc.) on input and paste, so text can never become bold.
      formats: [],
    });

    quill.root.setAttribute("dir", "rtl");
    // Also strips any legacy <strong>/<em>/<u> baked into previously saved
    // lyrics, so opening an old entry shows clean plain text.
    quill.clipboard.dangerouslyPasteHTML(content);

    quill.on("text-change", () => {
      onChangeRef.current(quill.root.innerHTML);
    });

    quillRef.current = quill;
    // `content` only seeds the initial value (uncontrolled editor) - intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} dir="rtl" />;
}

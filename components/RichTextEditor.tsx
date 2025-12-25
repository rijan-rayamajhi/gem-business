"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

type Props = {
  id?: string;
  value: string;
  onChange: (nextHtml: string) => void;
  variant?: "default" | "embedded";
};

export default function RichTextEditor({ id, value, onChange, variant = "default" }: Props) {
  const editorClass =
    variant === "embedded"
      ? "min-h-[160px] w-full bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:bg-zinc-50 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
      : "min-h-[160px] w-full rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1";

  const toolbarClass =
    variant === "embedded"
      ? "flex flex-wrap items-center gap-2 bg-white p-2"
      : "flex flex-wrap items-center gap-2 rounded-xl border border-zinc-900/10 bg-white p-2 shadow-sm";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: editorClass,
      },
    },
    onUpdate({ editor }: { editor: Editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "<p></p>", false);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-900/10 bg-white p-2 shadow-sm">
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Heading 1">
            H1
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Heading 2">
            H2
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Heading 3">
            H3
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Bold">
            B
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Italic">
            I
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Underline">
            U
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Strikethrough">
            S
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Bulleted list">
            •
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Numbered list">
            1.
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Quote">
            “ ”
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Code block">
            {"</>"}
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Horizontal rule">
            ―
          </button>
          <button type="button" className={btnClass(false) + " opacity-50"} disabled aria-label="Clear formatting">
            ✕
          </button>
        </div>
        <div className="min-h-[160px] w-full rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm" />
      </div>
    );
  }

  function btnClass(active: boolean) {
    return (
      "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-900/10 bg-white text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50" +
      (active ? " ring-2 ring-zinc-900/10" : "")
    );
  }

  return (
    <div className="grid gap-2">
      <div className={toolbarClass}>
        <button
          type="button"
          className={btnClass(editor.isActive("heading", { level: 1 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("heading", { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          I
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("underline"))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          U
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("strike"))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
        >
          S
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bulleted list"
        >
          •
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          1.
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("blockquote"))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
        >
          “ ”
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("codeBlock"))}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          aria-label="Code block"
        >
          {"</>"}
        </button>
        <button
          type="button"
          className={btnClass(false)}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          aria-label="Horizontal rule"
        >
          ―
        </button>
        <button
          type="button"
          className={btnClass(false)}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          aria-label="Clear formatting"
        >
          ✕
        </button>
      </div>

      <EditorContent editor={editor} id={id} />
    </div>
  );
}

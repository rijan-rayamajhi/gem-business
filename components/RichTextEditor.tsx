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
};

export default function RichTextEditor({ id, value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] w-full rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
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
        <div className="rounded-xl border border-zinc-900/10 bg-white p-2 shadow-sm" />
        <div className="min-h-[160px] w-full rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm" />
      </div>
    );
  }

  function btnClass(active: boolean) {
    return (
      "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50" +
      (active ? " ring-2 ring-zinc-900/10" : "")
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-900/10 bg-white p-2 shadow-sm">
        <button
          type="button"
          className={btnClass(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("underline"))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          Underline
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </button>
        <span className="h-5 w-px bg-zinc-200" />
        <button
          type="button"
          className={btnClass(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("heading", { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <button
          type="button"
          className={btnClass(editor.isActive("paragraph"))}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          P
        </button>
      </div>

      <EditorContent editor={editor} id={id} />
    </div>
  );
}

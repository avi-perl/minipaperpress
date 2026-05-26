// WYSIWYG editor surface, powered by TipTap (ProseMirror).
// Each front/back side owns its own editor instance; the focused one is
// reported up to the app so the shared toolbar can drive it.
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { buildEditorExtensions } from "../lib/editorExtensions";

interface EditableProps {
  html: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onFocusEditor?: (editor: Editor) => void;
}

export function Editable({ html, onChange, placeholder, onFocusEditor }: EditableProps) {
  const editor = useEditor({
    extensions: buildEditorExtensions(placeholder || "Start typing…"),
    content: html || "",
    editorProps: {
      // Reuse the existing .editable styling on the contentEditable element.
      attributes: { class: "editable" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: ({ editor }) => onFocusEditor?.(editor),
  });

  // Sync external content changes into the editor (e.g. loading another document)
  // without disturbing the caret while the user is actively typing.
  useEffect(() => {
    if (!editor) return;
    const next = html || "";
    if (!editor.isFocused && editor.getHTML() !== next) {
      editor.commands.setContent(next, false);
    }
  }, [html, editor]);

  return <EditorContent editor={editor} className="editable-host" />;
}

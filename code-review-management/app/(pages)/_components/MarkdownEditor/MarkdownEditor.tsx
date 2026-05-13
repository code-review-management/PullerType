"use client";

import { ReactNode, useEffect, useState } from "react";
import { useEditor, EditorContent, Editor, FocusPosition } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import MarkdownEditorContext from "./MarkdownEditorContext";
import styles from "./MarkdownEditor.module.css";
import "./TiptapEditor.css";

/**
 * A Markdown renderer/editor used to display and write comments.
 *
 * Docs:
 * 1. https://tiptap.dev/docs/editor/getting-started/install/nextjs
 * 2. https://tiptap.dev/docs/editor/markdown/getting-started/installation
 *
 * TODO: Configure GitHub Flavored Markdown
 *
 * @param defaultEditable: Whether the editor should be editable on initial render.
 * @param defaultContent: Content to display in the editor on initial render.
 * @param actions: Action buttons to render below the editor content when it is
 *                 editable (e.g., publish or cancel buttons).
 * @param autofocus: A FocusPosition to automatically focus on initial render. Defaults to "end" if not provided.
 * @param placeholder: Optional placeholder text
 * @param onChange: Function to execute everytime the editor's content is updated.
 */
export default function MarkdownEditor({
  defaultEditable,
  defaultContent,
  actions,
  autofocus,
  placeholder,
  onChange,
}: {
  defaultEditable: boolean;
  defaultContent?: string;
  actions?: ReactNode;
  autofocus?: FocusPosition;
  placeholder?: string;
  onChange?: (markdown: string) => void;
}) {
  const [editable, setEditable] = useState(defaultEditable);
  const [editorContent, setEditorContent] = useState(defaultContent ?? "");
  // Used to prevent mismatched transactions when setting autofocus.
  const [editorReady, setEditorReady] = useState(false);

  // Default to "end" autofocus unless autofocus is explicitly passed in as a param.
  const focusLocation = autofocus === undefined ? "end" : autofocus;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,

      // Docs: https://tiptap.dev/docs/editor/extensions/functionality/placeholder
      Placeholder.configure({
        placeholder,
      }),
    ],
    editable: defaultEditable,
    content: defaultContent,
    contentType: "markdown",
    autofocus: focusLocation,
    immediatelyRender: false,
    onCreate: () => setEditorReady(true),
    onUpdate: ({ editor }: { editor: Editor }) => {
      const markdown = editor.getMarkdown();
      setEditorContent(markdown);
      if (onChange) {
        onChange(markdown);
      }
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
      if (editable && editorReady) editor.commands.focus(focusLocation);
    }
  }, [editor, editable, editorReady, focusLocation]);

  // Docs: https://github.com/ueberdosis/tiptap/issues/5068#issuecomment-2465958436
  const handleEditorClick = () => {
    if (editor && !editor.isFocused) {
      editor.commands.focus("end");
    }
  };

  return (
    <MarkdownEditorContext
      value={{
        editorContent,
        setEditable,
      }}
    >
      <div
        className={editable ? styles.editable : ""}
        // Block autofocus if the editor is not ready.
        style={{ visibility: editorReady ? "visible" : "hidden" }}
        onClick={editable ? handleEditorClick : undefined}
      >
        <EditorContent editor={editor} className={styles.tiptap} />
        {editable && actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </MarkdownEditorContext>
  );
}

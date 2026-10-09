"use client";

import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import ResizableImageExtension from "tiptap-extension-resize-image";
import { cn } from "@/lib/utils";
import { Toolbar } from "./Toolbar";
import ImageInsertModal from "./ImageInsertModal";
import LinkInsertModal from "./LinkInsertModal";

// RichTextViewer 컴포넌트 - 읽기 전용으로 HTML 렌더링
export function RichTextViewer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: content }}
      className={cn(
        "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl",
        className
      )}
    />
  );
}

interface RichTextEditorProps {
  placeholder?: string;
  onChange?: (value: string) => void;
  value?: string;
  className?: string;
}

export function RichTextEditor({
  placeholder = "내용을 입력해주세요",
  onChange,
  className,
  value,
}: RichTextEditorProps) {
  const [, setEditorState] = useState(0);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        paragraph: {},
        link: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ResizableImageExtension,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-blue-500 underline cursor-pointer",
        },
      }),
    ],
    content: value,
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose max-w-none focus:outline-none min-h-[500px] prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-base prose-p:leading-7",
      },
    },
    onUpdate({ editor }) {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    onSelectionUpdate: () => {
      setEditorState((prev) => prev + 1);
    },
  });

  if (!editor) {
    return null;
  }

  const handleLinkInsert = (url: string, text?: string) => {
    const displayText = text && text.trim() ? text.trim() : url;

    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${displayText}</a>`)
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleImageInsert = (src: string, alt?: string) => {
    editor
      .chain()
      .focus()
      .setImage({ src, alt: alt || "" })
      .run();
  };

  return (
    <div
      className={cn(
        "flex min-h-[300px] w-full flex-col items-start rounded border border-input bg-white p-4 lg:p-5",
        className
      )}
    >
      {editor && (
        <Toolbar
          editor={editor}
          onLinkModalOpen={() => setIsLinkModalOpen(true)}
          onImageModalOpen={() => setIsImageModalOpen(true)}
        />
      )}
      <div className="h-full w-full p-4 bg-white">
        <style jsx global>{`
          .ProseMirror h1 {
            font-size: 2.25rem !important;
            font-weight: 700 !important;
            line-height: 2.5rem !important;
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          .ProseMirror h2 {
            font-size: 1.875rem !important;
            font-weight: 700 !important;
            line-height: 2.25rem !important;
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          .ProseMirror h3 {
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            line-height: 2rem !important;
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          .ProseMirror p {
            font-size: 1rem !important;
            line-height: 1.75rem !important;
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>

      <LinkInsertModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onInsert={handleLinkInsert}
        defaultText={
          editor.state.selection.empty
            ? ""
            : editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to
              )
        }
      />
      <ImageInsertModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={handleImageInsert}
      />
    </div>
  );
}

"use client";

import React, { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/components/hooks/common/useClickOutside";
import { LinkIcon, ImageIcon } from "./icons";
import { Divider } from "@/components/ui/Divider";
import {
  ChevronDown,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
  onLinkModalOpen: () => void;
  onImageModalOpen: () => void;
}

type BlockType = "paragraph" | "heading1" | "heading2" | "heading3";

// 텍스트 정렬 상태를 아이콘과 레이블로 반환하는 헬퍼 함수
const getCurrentAlignType = (editor: Editor) => {
  if (editor.isActive({ textAlign: "center" })) {
    return { icon: <AlignCenter className="h-4 w-4" />, title: "가운데 정렬" };
  }
  if (editor.isActive({ textAlign: "right" })) {
    return { icon: <AlignRight className="h-4 w-4" />, title: "오른쪽 정렬" };
  }
  if (editor.isActive({ textAlign: "justify" })) {
    return { icon: <AlignJustify className="h-4 w-4" />, title: "양쪽 정렬" };
  }
  // 기본값은 왼쪽 정렬
  return { icon: <AlignLeft className="h-4 w-4" />, title: "왼쪽 정렬" };
};

export function Toolbar({
  editor,
  onLinkModalOpen,
  onImageModalOpen,
}: ToolbarProps) {
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
  const [isBulletMenuOpen, setIsBulletMenuOpen] = useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);

  const headingMenuRef = useClickOutside<HTMLDivElement>(() => {
    setIsHeadingMenuOpen(false);
  }, isHeadingMenuOpen);

  const bulletMenuRef = useClickOutside<HTMLDivElement>(() => {
    setIsBulletMenuOpen(false);
  }, isBulletMenuOpen);

  const alignMenuRef = useClickOutside<HTMLDivElement>(() => {
    setIsAlignMenuOpen(false);
  }, isAlignMenuOpen);

  const toggleBold = useCallback(() => {
    editor.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor.chain().focus().toggleUnderline().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor.chain().focus().toggleStrike().run();
  }, [editor]);

  const setLink = useCallback(() => {
    onLinkModalOpen();
  }, [onLinkModalOpen]);

  const setImage = useCallback(() => {
    onImageModalOpen();
  }, [onImageModalOpen]);

  const getBlockTypeLabel = (): string => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Paragraph";
  };

  const setBlockType = (type: BlockType) => {
    switch (type) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        break;
      case "heading1":
        editor.chain().focus().setHeading({ level: 1 }).run();
        break;
      case "heading2":
        editor.chain().focus().setHeading({ level: 2 }).run();
        break;
      case "heading3":
        editor.chain().focus().setHeading({ level: 3 }).run();
        break;
    }
    setIsHeadingMenuOpen(false);
  };

  const currentAlign = getCurrentAlignType(editor);

  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row">
      {/* Heading Dropdown */}
      <div className="relative flex items-center gap-4" ref={headingMenuRef}>
        <button
          type="button"
          onClick={() => setIsHeadingMenuOpen(!isHeadingMenuOpen)}
          className="flex items-center gap-2 rounded px-3 py-1.5 text-primary transition-all hover:bg-primary/10 hover:shadow-sm"
        >
          <span className="text-base font-normal leading-6">
            {getBlockTypeLabel()}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
        {isHeadingMenuOpen && (
          <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBlockType("paragraph");
              }}
              className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-primary/5"
            >
              Paragraph
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBlockType("heading1");
              }}
              className="w-full px-4 py-2 text-left text-lg font-bold transition-colors hover:bg-primary/5"
            >
              Heading 1
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBlockType("heading2");
              }}
              className="w-full px-4 py-2 text-left text-base font-bold transition-colors hover:bg-primary/5"
            >
              Heading 2
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBlockType("heading3");
              }}
              className="w-full px-4 py-2 text-left text-sm font-bold transition-colors hover:bg-primary/5"
            >
              Heading 3
            </button>
          </div>
        )}
      </div>
      <Divider
        type="vertical"
        className="hidden h-8 w-px bg-[#E0E2E7] sm:flex"
      />
      <div className="flex gap-1 sm:gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleBold();
          }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded text-base font-bold leading-6 transition-all",
            editor.isActive("bold")
              ? "bg-primary text-white shadow-sm"
              : "bg-transparent text-primary hover:bg-primary/10 hover:shadow-sm"
          )}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleItalic();
          }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded text-base italic leading-6 transition-all",
            editor.isActive("italic")
              ? "bg-primary text-white shadow-sm"
              : "bg-transparent text-primary hover:bg-primary/10 hover:shadow-sm"
          )}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleUnderline();
          }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded text-base leading-6 underline transition-all",
            editor.isActive("underline")
              ? "bg-primary text-white shadow-sm"
              : "bg-transparent text-primary hover:bg-primary/10 hover:shadow-sm"
          )}
          title="Underline (Ctrl+U)"
        >
          U
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleStrike();
          }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded text-base leading-6 line-through transition-all",
            editor.isActive("strike")
              ? "bg-primary text-white shadow-sm"
              : "bg-transparent text-primary hover:bg-primary/10 hover:shadow-sm"
          )}
          title="Strikethrough"
        >
          S
        </button>
        <div className="relative" ref={bulletMenuRef}>
          <div
            onClick={() => setIsBulletMenuOpen(!isBulletMenuOpen)}
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-transparent text-primary transition-all hover:bg-primary/10 hover:shadow-sm"
            )}
            title="List"
          >
            {editor.isActive("orderedList") ? (
              <ListOrdered className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
            <ChevronDown
              className={cn(
                "h-3 w-3 text-primary",
                isBulletMenuOpen && "rotate-180"
              )}
            />
            {isBulletMenuOpen && (
              <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().toggleBulletList().run();
                    setIsBulletMenuOpen(false); // ✨ 메뉴 닫기 명확히
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-primary/5"
                >
                  <List className="h-4 w-4" /> <span>글머리 기호</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().toggleOrderedList().run();
                    setIsBulletMenuOpen(false); // ✨ 메뉴 닫기 명확히
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-primary/5"
                >
                  <ListOrdered size={16} /> <span>번호 매기기</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="relative" ref={alignMenuRef}>
          <div
            onClick={() => setIsAlignMenuOpen(!isAlignMenuOpen)}
            className={cn(
              "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-transparent text-primary transition-all hover:bg-primary/10 hover:shadow-sm"
            )}
            title="Text Alignment"
          >
            {currentAlign.icon}
            <ChevronDown
              className={cn(
                "h-3 w-3 text-primary",
                isAlignMenuOpen && "rotate-180"
              )}
            />
            {isAlignMenuOpen && (
              <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().setTextAlign("left").run();
                    setIsAlignMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-primary/5"
                >
                  <AlignLeft className="h-4 w-4" /> <span>왼쪽 정렬</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().setTextAlign("center").run();
                    setIsAlignMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-primary/5"
                >
                  <AlignCenter className="h-4 w-4" /> <span>가운데 정렬</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().setTextAlign("right").run();
                    setIsAlignMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-primary/5"
                >
                  <AlignRight className="h-4 w-4" />
                  <span>오른쪽 정렬</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().setTextAlign("justify").run();
                    setIsAlignMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-primary/5"
                >
                  <AlignJustify className="h-4 w-4" /> <span>양쪽 정렬</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <Divider type="vertical" className="h-8 w-px bg-[#E0E2E7]" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLink();
          }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded transition-all",
            editor.isActive("link")
              ? "bg-primary text-white shadow-sm"
              : "bg-transparent text-primary hover:bg-primary/10 hover:shadow-sm"
          )}
          title="Link"
        >
          <LinkIcon />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded bg-transparent text-primary transition-all hover:bg-primary/10 hover:shadow-sm"
          title="Image"
          onClick={(e) => {
            e.stopPropagation();
            setImage();
          }}
        >
          <ImageIcon />
        </button>
      </div>
    </div>
  );
}

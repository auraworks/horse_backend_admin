"use client";

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";

interface LinkInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text?: string) => void;
  defaultText?: string;
}

export default function LinkInsertModal({
  isOpen,
  onClose,
  onInsert,
  defaultText = "",
}: LinkInsertModalProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState(defaultText);

  const handleInsert = () => {
    if (!url.trim()) {
      return;
    }
    onInsert(url.trim(), text.trim() || undefined);
    handleClose();
  };

  const handleClose = () => {
    setUrl("");
    setText(defaultText);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <ModalContent className="w-full md:w-[500px]">
        <ModalHeader onClose={handleClose}>링크 삽입</ModalHeader>
        <ModalBody>
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="link-url" className="text-sm font-semibold">
                URL *
              </Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="link-text" className="text-sm font-semibold">
                표시 텍스트 (선택사항)
              </Label>
              <Input
                id="link-text"
                type="text"
                placeholder="링크 텍스트"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex w-full gap-3">
            <Button
              className="basis-1/2"
              type="button"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
            >
              취소
            </Button>
            <Button
              className="basis-1/2"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleInsert();
              }}
              disabled={!url.trim()}
            >
              삽입
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Upload } from "lucide-react";

interface ImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (src: string, alt?: string) => void;
}

type InsertMode = "url" | "file";

export default function ImageInsertModal({
  isOpen,
  onClose,
  onInsert,
}: ImageInsertModalProps) {
  const [mode, setMode] = useState<InsertMode>("url");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [filePreview, setFilePreview] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다.");
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInsert = () => {
    if (mode === "url") {
      if (!url.trim()) {
        return;
      }
      onInsert(url.trim(), alt.trim() || undefined);
    } else {
      if (!filePreview) {
        return;
      }
      onInsert(filePreview, alt.trim() || fileName);
    }
    handleClose();
  };

  const handleClose = () => {
    setMode("url");
    setUrl("");
    setAlt("");
    setFilePreview("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const isValid = mode === "url" ? url.trim() : filePreview;

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <ModalContent className="w-full md:w-[550px]">
        <ModalHeader onClose={handleClose}>이미지 삽입</ModalHeader>
        <ModalBody>
          <div className="flex w-full flex-col gap-4">
            {/* 탭 선택 */}
            <div className="border-border flex gap-2 border-b">
              <button
                type="button"
                onClick={() => setMode("url")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === "url"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                URL로 삽입
              </button>
              <button
                type="button"
                onClick={() => setMode("file")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === "file"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                파일 업로드
              </button>
            </div>

            {/* URL 입력 모드 */}
            {mode === "url" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="image-url" className="text-sm font-semibold">
                    이미지 URL *
                  </Label>
                  <Input
                    id="image-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                </div>
                {url && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">미리보기</Label>
                    <div className="border-border flex items-center justify-center rounded-md border bg-muted p-4">
                      <img
                        src={url}
                        alt="Preview"
                        className="max-h-48 max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 파일 업로드 모드 */}
            {mode === "file" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold">이미지 파일 *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-border h-32 w-full border-2 border-dashed transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {fileName || "클릭하여 이미지 선택"}
                      </span>
                    </div>
                  </Button>
                </div>
                {filePreview && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">미리보기</Label>
                    <div className="border-border flex items-center justify-center rounded-md border bg-muted p-4">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-48 max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 대체 텍스트 (공통) */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="image-alt" className="text-sm font-semibold">
                대체 텍스트 (선택사항)
              </Label>
              <Input
                id="image-alt"
                type="text"
                placeholder="이미지 설명"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
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
              disabled={!isValid}
            >
              삽입
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

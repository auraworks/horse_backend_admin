"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onCancel?: () => void;
  children?: ReactNode;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export const Modal = ({
  open,
  isOpen,
  onClose,
  onCancel,
  children,
  title,
  message,
  onConfirm,
  isLoading = false,
  confirmText = "확인",
  cancelText = "취소",
}: ModalProps) => {
  const isModalOpen = open ?? isOpen ?? false;

  if (!isModalOpen) return null;

  const isComposable = children !== undefined;

  if (isComposable) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2A2A2A]">{title}</h2>
          <button
            onClick={onCancel ?? onClose}
            disabled={isLoading}
            className="text-[#999] hover:text-[#333] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#666] mb-6 leading-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel ?? onClose}
            disabled={isLoading}
            className="px-6"
          >
            {cancelText}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="px-6">
            {isLoading ? "처리 중..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ModalContentProps {
  children: ReactNode;
  className?: string;
}

export const ModalContent = ({
  children,
  className = "",
}: ModalContentProps) => {
  return <div className={`w-full ${className}`}>{children}</div>;
};

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
}

export const ModalHeader = ({ children, onClose }: ModalHeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
      <h2 className="text-lg font-semibold">{children}</h2>
      {onClose && (
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export const ModalBody = ({ children, className = "" }: ModalBodyProps) => {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
};

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export const ModalFooter = ({ children, className = "" }: ModalFooterProps) => {
  return (
    <div className={`border-t border-border px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

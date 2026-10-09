"use client";

import { Toast as ToastType } from "@/components/hooks/useToast";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

export const Toast = ({ toast, onClose }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 300);
    }, 2700);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const isSuccess = toast.type === "success";
  const bgColor = isSuccess ? "bg-[#4CA452]" : "bg-[#D65856]";
  const Icon = isSuccess ? CheckCircle : AlertCircle;

  return (
    <div
      className={`w-auto flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-lg transition-all duration-300 ${bgColor} ${
        isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="ml-2 hover:opacity-80 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

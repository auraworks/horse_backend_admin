"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "./Toast";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  success: (message: string) => void;
  error: (message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now().toString();
      const toast: ToastItem = { id, type, message };

      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        removeToast(id);
      }, 3000);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string) => {
      showToast("success", message);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string) => {
      showToast("error", message);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, success, error, removeToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      success: () => {},
      error: () => {},
      removeToast: () => {},
    };
  }
  return context;
};

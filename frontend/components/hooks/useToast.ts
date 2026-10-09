import { useState, useCallback } from "react";

export type ToastType = "success" | "error";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    const toast: Toast = { id, type, message };

    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, success, error, removeToast };
};

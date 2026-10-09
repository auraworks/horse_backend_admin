import { useState, useCallback } from "react";

export interface ModalConfig {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = useCallback((modalConfig: ModalConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
    setIsLoading(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!config) return;

    setIsLoading(true);
    try {
      await config.onConfirm();
      closeModal();
    } catch {
      setIsLoading(false);
    }
  }, [config, closeModal]);

  const handleCancel = useCallback(() => {
    config?.onCancel?.();
    closeModal();
  }, [config, closeModal]);

  return {
    isOpen,
    config,
    isLoading,
    openModal,
    closeModal,
    handleConfirm,
    handleCancel,
  };
};

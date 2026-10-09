import { useEffect, useRef } from "react";

export function useClickOutside<T extends HTMLElement>(
  callback: () => void,
  isActive: boolean
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [callback, isActive]);

  return ref;
}

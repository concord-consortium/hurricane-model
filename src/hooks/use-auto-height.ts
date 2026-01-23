import { useEffect, useRef, useState, useCallback } from "react";
import { setHeight } from "@concord-consortium/lara-interactive-api";

interface IUseAutoHeightOptions {
  disabled?: boolean;
}

/**
 * Hook that reports container height to the LARA/Activity Player host.
 * Returns a callback ref that should be attached to the container element.
 */
export const useAutoHeight = ({ disabled }: IUseAutoHeightOptions = {}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const setHeightCalled = useRef(false);

  // Callback ref to capture the container element
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  useEffect(() => {
    if (disabled || !container) {
      // Sending empty string disables height and uses aspect ratio instead
      if (setHeightCalled.current) {
        setHeight("");
      }
      return;
    }

    // Set overflow hidden for accurate scrollHeight measurement
    const prevOverflow = container.style.overflow;
    container.style.overflow = "hidden";

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.target.scrollHeight ?? 0;
      if (height > 0) {
        setHeight(Math.ceil(height));
        setHeightCalled.current = true;
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      container.style.overflow = prevOverflow;
    };
  }, [container, disabled]);

  return containerRef;
};

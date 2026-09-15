import React, { useCallback } from "react";

import { IPosition } from "../../types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function clampToParent(position: IPosition, element: HTMLElement): IPosition {
  const parent = element.offsetParent;
  if (!parent) return position;
  const horizontalSpace = parent.clientWidth - element.offsetWidth;
  const verticalSpace = parent.clientHeight - element.offsetHeight;
  return {
    // If the element is bigger than its parent, do not clamp it.
    left: horizontalSpace > 0 ? clamp(position.left, 0, horizontalSpace) : position.left,
    top: verticalSpace > 0 ? clamp(position.top, 0, verticalSpace) : position.top
  };
}

interface IUseDraggableOptions {
  // The element being moved. Its offsetParent bounds the drag.
  elementRef: React.RefObject<HTMLElement | null>;
  onMove: (position: IPosition) => void;
}

// Returns the pointer-down handler for the drag handle.
export function useDraggable({ elementRef, onMove }: IUseDraggableOptions) {
  return useCallback((event: React.PointerEvent<HTMLElement>) => {
    const element = elementRef.current;
    const parent = element?.offsetParent;
    if (!element || !parent) return;
    if (event.target instanceof Element && event.target.closest("button")) return;

    const handle = event.currentTarget;
    const parentRect = parent.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const grabX = event.clientX - rect.left;
    const grabY = event.clientY - rect.top;

    const handleMove = (moveEvent: PointerEvent) => {
      onMove(clampToParent({
        left: moveEvent.clientX - parentRect.left - grabX,
        top: moveEvent.clientY - parentRect.top - grabY
      }, element));
    };
    const handleEnd = () => {
      handle.removeEventListener("pointermove", handleMove);
      handle.removeEventListener("pointerup", handleEnd);
      handle.removeEventListener("pointercancel", handleEnd);
      handle.releasePointerCapture?.(event.pointerId);
    };

    // Capturing keeps move events on the handle even when the pointer outruns it.
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener("pointermove", handleMove);
    handle.addEventListener("pointerup", handleEnd);
    handle.addEventListener("pointercancel", handleEnd);
    event.preventDefault();
  }, [elementRef, onMove]);
}

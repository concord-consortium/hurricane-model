import { render, screen } from "@testing-library/react";
import React, { useRef } from "react";

import { IPosition } from "../../types";
import { clampToParent, useDraggable } from "./use-draggable";

function Draggable({ onMove }: { onMove: (position: IPosition) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handlePointerDown = useDraggable({ elementRef: ref, onMove });
  return (
    <div data-test="parent">
      <div ref={ref} data-test="box">
        <div data-test="handle" onPointerDown={handlePointerDown}>
          <button type="button" data-test="button" />
        </div>
      </div>
    </div>
  );
}

const defineSize = (element: HTMLElement, sizes: Record<string, number>) => {
  Object.entries(sizes).forEach(([name, value]) => Object.defineProperty(element, name, { value, configurable: true }));
};

const pointer = (element: HTMLElement, type: string, clientX: number, clientY: number) => {
  element.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }));
};

describe("useDraggable", () => {
  let onMove: jest.Mock;
  let handle: HTMLElement;
  let button: HTMLElement;

  beforeEach(() => {
    onMove = jest.fn();
    render(<Draggable onMove={onMove} />);
    const parent = screen.getByTestId("parent");
    const box = screen.getByTestId("box");
    handle = screen.getByTestId("handle");
    button = screen.getByTestId("button");

    defineSize(parent, { clientWidth: 800, clientHeight: 600 });
    parent.getBoundingClientRect = () => ({ left: 100, top: 50, width: 800, height: 600 } as DOMRect);
    Object.defineProperty(box, "offsetParent", { value: parent, configurable: true });
    defineSize(box, { offsetWidth: 200, offsetHeight: 100 });
    box.getBoundingClientRect = () => ({ left: 150, top: 80, width: 200, height: 100 } as DOMRect);
  });

  it("moves the element by the pointer delta, relative to its parent", () => {
    pointer(handle, "pointerdown", 160, 90);
    pointer(handle, "pointermove", 400, 300);
    expect(onMove).toHaveBeenLastCalledWith({ left: 290, top: 240 });
  });

  it("keeps the element inside its parent", () => {
    pointer(handle, "pointerdown", 160, 90);
    pointer(handle, "pointermove", 5000, 5000);
    expect(onMove).toHaveBeenLastCalledWith({ left: 600, top: 500 });
    pointer(handle, "pointermove", -5000, -5000);
    expect(onMove).toHaveBeenLastCalledWith({ left: 0, top: 0 });
  });

  it("stops following the pointer after it is released", () => {
    pointer(handle, "pointerdown", 160, 90);
    pointer(handle, "pointerup", 160, 90);
    pointer(handle, "pointermove", 400, 300);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("ignores pointer-downs on buttons inside the handle", () => {
    pointer(button, "pointerdown", 160, 90);
    pointer(handle, "pointermove", 400, 300);
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe("clampToParent", () => {
  it("clamps a position so the element stays inside its offset parent", () => {
    const parent = document.createElement("div");
    const element = document.createElement("div");
    defineSize(parent, { clientWidth: 800, clientHeight: 600 });
    Object.defineProperty(element, "offsetParent", { value: parent });
    defineSize(element, { offsetWidth: 200, offsetHeight: 100 });

    expect(clampToParent({ left: 700, top: 550 }, element)).toEqual({ left: 600, top: 500 });
    expect(clampToParent({ left: -5, top: -5 }, element)).toEqual({ left: 0, top: 0 });
    expect(clampToParent({ left: 10, top: 10 }, element)).toEqual({ left: 10, top: 10 });
  });
});

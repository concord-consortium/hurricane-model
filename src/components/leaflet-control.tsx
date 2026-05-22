import { FC, ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Control as LeafletControl, DomEvent, DomUtil } from "leaflet";
import { useMap } from "react-leaflet";

interface IProps {
  position: L.ControlPosition;
  className?: string;
  children?: ReactNode;
}

export const Control: FC<IProps> = ({ position, className, children }) => {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevClassName = useRef<string>("");

  if (!containerRef.current) {
    const div = DomUtil.create("div", className || "");
    DomEvent.disableClickPropagation(div);
    DomEvent.disableScrollPropagation(div);
    containerRef.current = div;
  }

  useEffect(() => {
    const ControlClass = LeafletControl.extend({
      onAdd: () => containerRef.current as HTMLElement,
      onRemove: () => undefined
    });
    const control = new ControlClass({ position });
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, position]);

  useEffect(() => {
    if (prevClassName.current) {
      const classes = prevClassName.current.split(" ");
      classes.forEach(c => {
        containerRef.current?.classList.remove(c);
      });
    }
    if (className) {
      const classes = className.split(" ");
      classes.forEach(c => {
        containerRef.current?.classList.add(c);
      });
    }
    prevClassName.current = className ?? "";
  }, [className]);

  return containerRef.current ? createPortal(children, containerRef.current) : null;
};

export default Control;

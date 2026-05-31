import { clsx } from "clsx";
import React, { ReactNode } from "react";
import DragIcon from "../assets/drag.svg";
import css from "./draggable-map-icon.scss";

interface IProps {
  children?: ReactNode;
  dimmed?: boolean;
  disabled?: boolean;
  label?: string;
}

export function DraggableMapIcon({ children, dimmed, disabled, label }: IProps) {
  return (
    <div
      className={clsx(css.draggableMapIcon, { [css.disabled]: disabled, [css.dimmed]: dimmed })}
      data-test="pressure-system-icon"
    >
      <div className={`${css.dragIcon} ${disabled ? css.disabled : ""}`}><DragIcon /></div>
      {children}
      {label && <div className={css.label}>{label}</div>}
    </div>
  );
}

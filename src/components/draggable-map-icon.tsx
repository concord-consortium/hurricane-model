import { clsx } from "clsx";
import React, { ReactNode } from "react";

import config from "../config";

import DragIcon from "../assets/drag.svg";

import css from "./draggable-map-icon.scss";

interface IProps {
  children?: ReactNode;
  dimmed?: boolean;
  disabled?: boolean;
  label?: string;
}

export function DraggableMapIcon({ children, dimmed, disabled, label }: IProps) {
  const conditionalClasses = { [css.disabled]: disabled, [css.dimmed]: dimmed, [css.glow]: config.mode === "storm" };
  return (
    <div className={clsx(css.draggableMapIcon, conditionalClasses)} data-test="draggable-map-icon">
      <div className={clsx(css.dragIcon, { [css.disabled]: disabled })}><DragIcon /></div>
      {children}
      {label && <div className={css.label}>{label}</div>}
    </div>
  );
}

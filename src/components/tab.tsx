import clsx from "clsx";
import React from "react";
import css from "./tab.scss";

interface IProps {
  active?: boolean;
  className?: string;
  dataTest?: string;
  image?: string;
  onClick?: (e: React.SyntheticEvent) => void;
  side: "left" | "right";
  text: string;
}

export function Tab({ active, className, dataTest, image, onClick, side, text }: IProps) {
  const imageStyle = image ? { backgroundImage: `url(${image})` } : undefined;
  const sideClass = side === "right" ? css.right : css.left;
  const activeClass = { [css.active]: active };

  return (
    <button type="button" data-test={dataTest} className={clsx(css.panelTab, sideClass, activeClass)} onClick={onClick}>
      <div className={clsx(css.tab, className)} data-test={`${side}-tab`}>
        <div className={clsx(css.tabBack, sideClass, className, activeClass)}>
          <div className={clsx(css.tabImage, className)} style={imageStyle}/>
          <div className={css.tabContent}>{text}</div>
        </div>
      </div>
    </button>
  );
}

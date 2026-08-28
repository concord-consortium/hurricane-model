import clsx from "clsx";
import React from "react";
import css from "./tab.scss";

interface IProps {
  active?: boolean;
  className?: string;
  dataTest?: string;
  id?: string;
  image?: string;
  onClick?: (e: React.SyntheticEvent) => void;
  side: "left" | "right";
  text: string;
}

export function Tab({ active, className, dataTest, id, image, onClick, side, text }: IProps) {
  const imageStyle = image ? { backgroundImage: `url(${image})` } : undefined;
  const sideClass = side === "right" ? css.right : css.left;

  return (
    <div
      id={id}
      data-test={dataTest}
      className={clsx(css.panelTab, sideClass)}
      onClick={onClick}
    >
      <div className={clsx(css.tab, className)} data-test={`${side}-tab`}>
        <div className={clsx(css.tabBack, sideClass, className, { [css.active]: active })}>
          <div className={clsx(css.tabImage, className)} style={imageStyle}/>
          <div className={css.tabContent}>{text}</div>
        </div>
      </div>
    </div>
  );
}

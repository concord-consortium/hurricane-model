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
  // The setup tab (the only left tab) is hidden when the left panel is open.
  const inert = side === "left" && active;

  return (
    <button
      type="button"
      data-test={dataTest}
      className={clsx(css.panelTab, sideClass, activeClass)}
      inert={inert}
      onClick={onClick}
    >
      <div className={css.tab}>
        <div
          className={clsx(css.tabBack, sideClass, className, activeClass)}
          data-test={`${dataTest}-back`}
          data-active={!!active}
        >
          <div className={css.tabImage} style={imageStyle}/>
          <div className={css.tabContent}>{text}</div>
        </div>
      </div>
    </button>
  );
}

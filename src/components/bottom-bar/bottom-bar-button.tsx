import { clsx } from "clsx";
import * as React from "react";
import Button from "@mui/material/Button";
import css from "./bottom-bar-button.scss";

export interface IBottomBarButtonProps {
  active?: boolean;
  buttonText?: string;
  className?: string;
  dataTest?: string;
  disabled?: boolean;
  highlightIcon?: React.JSX.Element;
  icon?: React.JSX.Element;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const BottomBarButton = ({
  className, icon, highlightIcon, onClick, disabled, active, buttonText, dataTest
}: IBottomBarButtonProps) => {
  const buttonClass = clsx(css.bottomBarButton, className, { [css.disabled]: disabled, [css.active]: active });
  const textClass = icon ? css.iconButtonText : css.bottomBarButtonText;
  return (
    <Button
      onClick={onClick}
      className={buttonClass}
      disableRipple={true}
      data-test={dataTest ? dataTest : "bottom-bar-button"}
      disableTouchRipple={true}
      disabled={disabled}
    >
      <span>
        {/* default icon should have white outline */}
        { icon }
        {/* highlight icon should have gray outline */}
        { highlightIcon && <div className={css.bottomBarButtonHighlightSvg}>{ highlightIcon }</div> }
        {/* active icon should have white outline, that's why the main one can be reused */}
        { icon && <span className={css.bottomBarButtonActiveSvg}>{ icon }</span> }
        <span className={textClass}>{ buttonText }</span>
      </span>
    </Button>
  );
}

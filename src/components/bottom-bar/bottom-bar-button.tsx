import * as React from "react";
import Button from "@mui/material/Button";
import css from "./bottom-bar-button.scss";

export interface IBottomBarButtonProps {
  icon?: React.JSX.Element;
  highlightIcon?: React.JSX.Element;
  buttonText?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  disabled?: boolean;
  dataTest?: string;
  active?: boolean;
}

export const BottomBarButton =
  ({ icon, highlightIcon, onClick, disabled, active, buttonText, dataTest }: IBottomBarButtonProps) =>
{
  const textClass = icon ? css.iconButtonText : css.bottomBarButtonText;
  return (
    <Button
      onClick={onClick}
      className={`${css.bottomBarButton} ${disabled ? css.disabled : ""} ${active ? css.active : ""}`}
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

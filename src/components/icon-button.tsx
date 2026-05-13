import * as React from "react";
import Button from "@mui/material/Button";
import css from "./icon-button.scss";

interface IProps {
  icon: React.JSX.Element;
  highlightIcon: React.JSX.Element;
  buttonText?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  disabled?: boolean;
  dataTest?: string;
  active?: boolean;
}

export const IconButton = ({ icon, highlightIcon, onClick, disabled, active, buttonText, dataTest }: IProps) => (
  <Button
    onClick={onClick}
    className={`${css.iconButton} ${disabled ? css.disabled : ""} ${active ? css.active : ""}`}
    disableRipple={true}
    data-test={dataTest ? dataTest : "icon-button"}
    disableTouchRipple={true}
    disabled={disabled}
  >
    <span>
      {/* default icon should have white outline */}
      { icon }
      {/* highlight icon should have gray outline */}
      <div className={css.iconButtonHighlightSvg}>{ highlightIcon }</div>
      {/* active icon should have white outline, that's why the main one can be reused */}
      <span className={css.iconButtonActiveSvg}>{ icon }</span>
      <span className={css.iconButtonText}>{ buttonText }</span>
    </span>
  </Button>
);

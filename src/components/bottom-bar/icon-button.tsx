import * as React from "react";
import { BottomBarButton, IBottomBarButtonProps } from "./bottom-bar-button";

interface IProps extends IBottomBarButtonProps {
  icon: React.JSX.Element;
  highlightIcon: React.JSX.Element;
}

export const IconButton = ({ icon, highlightIcon, onClick, disabled, active, buttonText, dataTest }: IProps) => (
  <BottomBarButton
    icon={icon}
    highlightIcon={highlightIcon}
    buttonText={buttonText}
    onClick={onClick}
    disabled={disabled}
    dataTest={dataTest}
    active={active}
  />
);

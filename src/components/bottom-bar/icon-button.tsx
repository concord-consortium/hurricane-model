import * as React from "react";
import { BottomBarButton, IBottomBarButtonProps } from "./bottom-bar-button";

interface IProps extends IBottomBarButtonProps {
  icon: React.JSX.Element;
  highlightIcon: React.JSX.Element;
}

export const IconButton = (props: IProps) => <BottomBarButton {...props} />;

import clsx from "clsx";
import React from "react";
import { RightTabType } from "../../models/ui";
import css from "./right-tab.scss";
import baseMapTabImg from "../../assets/base-map-tab.png";
import overlayTabImg from "../../assets/overlay-tab.png";

interface ITabSettings {
  image?: string;
  style: string;
  text: string;
}
const tabSettings: Record<RightTabType, ITabSettings> = {
  base: { style: css.geoMaps, text: "Base Maps", image: baseMapTabImg },
  overlay: { style: css.impactMaps, text: "Map Overlays", image: overlayTabImg },
  settings: { style: css.settings, text: "Settings" }
};

interface IProps {
  tabType: RightTabType;
  active: boolean;
}

export function RightTab({ active, tabType }: IProps) {
  const { style, text, image } = tabSettings[tabType];
  const imageStyle = image ? { backgroundImage: `url(${image})` } : undefined;
  return (
    <div className={clsx(css.mapTab, style)} data-test="right-tab">
      <div className={clsx(css.mapTabBack, style, { [css.active]: active })}>
        <div className={clsx(css.mapTabImage, style)} style={imageStyle}/>
        <div className={css.mapTabContent}>{text}</div>
      </div>
    </div>
  );
}

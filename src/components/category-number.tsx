import { clsx } from "clsx";
import React, { ReactElement } from "react";
import SVGTS from "../assets/TS.svg";
import SVG1 from "../assets/1.svg";
import SVG2 from "../assets/2.svg";
import SVG3 from "../assets/3.svg";
import SVG4 from "../assets/4.svg";
import SVG5 from "../assets/5.svg";

import css from "./category-number.scss";

const CategorySVG: Record<number, ReactElement> = {
  0: <SVGTS />,
  1: <SVG1 />,
  2: <SVG2 />,
  3: <SVG3 />,
  4: <SVG4 />,
  5: <SVG5 />,
};

interface IProps {
  className?: string;
  value: number;
}

export function CategoryNumber({ className = "trackMarker", value }: IProps) {
  return (
    <div className={clsx(css.categoryNumber, css[className])} data-test="hurricane-category" data-value={value}>
      { CategorySVG[value] }
    </div>
  );
}

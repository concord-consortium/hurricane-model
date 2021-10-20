import * as React from "react";
import SVGTS from "../assets/TS.svg";
import SVG1 from "../assets/1.svg";
import SVG2 from "../assets/2.svg";
import SVG3 from "../assets/3.svg";
import SVG4 from "../assets/4.svg";
import SVG5 from "../assets/5.svg";

import * as css from "./category-number.scss";

const CategorySVG: Record<number, React.ReactElement> = {
  0: <SVGTS />,
  1: <SVG1 />,
  2: <SVG2 />,
  3: <SVG3 />,
  4: <SVG4 />,
  5: <SVG5 />,
};

interface IProps {
  value: number;
}
interface IState {}

export class CategoryNumber extends React.Component<IProps, IState> {
  public render() {
    const { value } = this.props;
    return (
      <div className={css.categoryNumber} data-test="hurricane-category">
        { CategorySVG[value] }
      </div>
    );
  }
}

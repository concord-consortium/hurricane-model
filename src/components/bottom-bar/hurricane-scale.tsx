import * as React from "react";
import { hurricaneCategoryInfo } from "../../models/constants";
import css from "./hurricane-scale.scss";

interface IProps {}
interface IState {}

const renderCategory = (cat: number) => {
  const barClass = `${css.bar} ${css[`barCategory${cat}`]}`;
  const { nameShort, windRange } = hurricaneCategoryInfo[cat];
  return (
    <div key={cat} className={css.categoryContainer}>
      <div className={css.categoryValue}>{ nameShort }</div>
      <div className={barClass} />
      <div className={css.dot}>.</div>
      <div className={css.windSpeedRange}>{ windRange }</div>
    </div>
   );
};

export class HurricaneScale extends React.PureComponent<IProps, IState> {
  public render() {
    const categories = Array.from(hurricaneCategoryInfo.keys());
    return (
      <div className={css.hurricaneScale}>
        <div className={css.header}>Hurricane Scale</div>
        <div className={css.scaleContainer}>
          <div className={css.subheaders}>
            <div className={css.categoryLabel}>Category</div>
            <div className={css.windSpeedLabel}>Wind Speed</div>
          </div>
          { categories.map(cat => renderCategory(cat)) }
          <div className={css.mph}>mph</div>
        </div>
      </div>
    );
  }
}

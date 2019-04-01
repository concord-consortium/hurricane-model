import * as React from "react";
import * as css from "./hurricane-scale.scss";

interface IProps {}
interface IState {}

const windSpeeds: { [key: number]: string } = {
  0: "39-73",
  1: "74-95",
  2: "96-110",
  3: "111-129",
  4: "130-156",
  5: "≥157"
};

const renderCategory = (cat: number) => {
  const barClass = `${css.bar} ${css[`barCategory${cat}`]}`;
  return (
    <div key={cat} className={css.categoryContainer}>
      <div className={css.categoryValue}>{ cat === 0 ? "TS" : cat }</div>
      <div className={barClass} />
      <div className={css.dot}>.</div>
      <div className={css.windSpeedRange}>{ windSpeeds[cat] }</div>
    </div>
   );
};

export class HurricaneScale extends React.PureComponent<IProps, IState> {
  public render() {
    const categories = [0, 1, 2, 3, 4, 5];
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

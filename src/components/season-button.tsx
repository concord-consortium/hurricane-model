import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import Button from "@material-ui/core/Button";
import { Season } from "../types";

import * as css from "./season-button.scss";

interface IProps extends IBaseProps {}
interface IState {}

const seasons: Season[] = [ "fall", "winter", "spring", "summer" ];

@inject("stores")
@observer
export class SeasonButton extends BaseComponent<IProps, IState> {
  public render() {
    const sim = this.stores.simulation;
    return (
      <Button
        onClick={this.handleSeasonChange}
        className={css.seasonButton}
        data-test="season-select"
      >
        <span>
          <span className={css.seasonValue}>{ sim.season }</span>
          <span className={css.seasonLabel}>Season</span>
        </span>
      </Button>
    );
  }

  public handleSeasonChange = () => {
    const currentSeason = this.stores.simulation.season;
    const currentIdx = seasons.indexOf(currentSeason);
    this.stores.simulation.setSeason(seasons[(currentIdx + 1) % seasons.length]);
  }
}

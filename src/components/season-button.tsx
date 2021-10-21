import { log } from "@concord-consortium/lara-interactive-api";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";
import { Season, seasonLabels } from "../types";
import config from "../config";

import * as css from "./season-button.scss";

interface IProps extends IBaseProps {
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}
interface IState {}

const seasons: Season[] = [ "fall", "winter", "spring", "summer" ];

@inject("stores")
@observer
export class SeasonButton extends BaseComponent<IProps, IState> {
  public render() {
    const { onMenuOpen, onMenuClose } = this.props;
    const sim = this.stores.simulation;
    // If set to lock the UI while the simulation is running, lock UI once the sim is started until it is reset
    const uiDisabled = config.lockSimulationWhileRunning && sim.simulationStarted;
    return (
      <div className={`${css.seasonButton} ${uiDisabled ? css.disabled : ""}`}>
        <div className={css.seasonLabel}>Season</div>
        <div className={css.selectContainer}>
          <Select
            value={sim.season}
            onChange={this.handleSeasonChange}
            className={css.seasonSelect}
            data-test="season-button"
            disabled={uiDisabled}
            disableUnderline={true}
            renderValue={(season: Season) =>
                          <span style={{paddingLeft: 8}}>{seasonLabels[season]}</span>}
            onOpen={onMenuOpen}
            onClose={onMenuClose}
          >
            <MenuItem className={css.seasonItem} value="fall">
              <div data-test="season-item-fall">{seasonLabels.fall}</div>
              <OptionalCheck show={sim.season === "fall"}/>
            </MenuItem>
            <MenuItem className={css.seasonItem} value="winter">
              <div data-test="season-item-winter">{seasonLabels.winter}</div>
              <OptionalCheck show={sim.season === "winter"}/>
            </MenuItem>
            <MenuItem className={css.seasonItem} value="spring">
              <div data-test="season-item-spring">{seasonLabels.spring}</div>
              <OptionalCheck show={sim.season === "spring"}/>
            </MenuItem>
            <MenuItem className={css.seasonItem} value="summer">
              <div data-test="season-item-summer">{seasonLabels.summer}</div>
              <OptionalCheck show={sim.season === "summer"}/>
            </MenuItem>
          </Select>
        </div>
      </div>
    );
  }

  public handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const season = event.target.value as Season;
    this.stores.simulation.setSeason(season);
    log("SeasonChanged", { season });
  }
}

// Original spec had a check mark; updated spec does not.
// We leave the implementation in place in case the check mark comes back.
const OptionalCheck: React.FC<{ show: boolean }> = ({ show }) => {
  return null;
  // const checkMark = "\u2713"; // ✓
  // return (
  //   <div className={show ? "checked" : ""}>
  //     {show ? checkMark : ""}
  //   </div>
  // );
};

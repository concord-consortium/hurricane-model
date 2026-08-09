import Button from "@mui/material/Button";
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { useStores } from "../../stores-context";
import { modeSeasons, Season, seasonLabels } from "../../types";
import { SetupSection } from "./setup-section";

import SeasonIcon from "../../assets/left-panel/season.svg";

import css from "./season-section.scss";

const hint = "Select a season, which determines sea surface temperatures and wind shear.";
const postscript = (
  <>
    <span className={css.bold}>Note:</span>{" "}
    Sea surface temperatures peak in Late Fall, giving storms more energy to intensify.
  </>
);

interface ISeasonButtonProps {
  season: Season;
}
const SeasonButton = observer(function SeasonButton({ season }: ISeasonButtonProps) {
  const stores = useStores();
  const isSelected = stores.simulation.season === season;
  const classes = clsx(css.seasonButton, { [css.selected]: isSelected });

  const handleClick = () => {
    if (!isSelected) stores.simulation.setSeason(season);
  }

  return (
    <Button className={classes} onClick={handleClick} disableRipple={true}>
      {seasonLabels[season]}
    </Button>
  )
});

export function SeasonSection() {
  return (
    <SetupSection
      dataTest="season"
      hint={hint}
      Icon={SeasonIcon}
      postscript={postscript}
      setupMode="season"
      title="Season"
    >
      <div className={css.buttonArea}>
        {modeSeasons.storm.map(season => <SeasonButton key={season} season={season} />)}
      </div>
    </SetupSection>
  );
}

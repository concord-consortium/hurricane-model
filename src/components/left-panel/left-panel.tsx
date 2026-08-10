import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import clsx from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { useStores } from "../../stores-context";
import SetupIcon from "../../assets/bottom-bar/setup-icon.svg";
import { PressureSystemsSection } from "./pressure-systems-section";
import { RunOptions } from "./run-options";
import { SavedTracksSection } from "./saved-tracks-section";
import { SeasonSection } from "./season-section";
import { SeaSurfaceTemperaturesSection } from "./sea-surface-temperatures-section";
import { SingleTrackCard } from "./single-track-card";
import { StormCategorySection } from "./storm-category-section";
import { StormLocationSection } from "./storm-location-section";
import { TrackModeToggle } from "./track-mode-toggle";

import css from "./left-panel.scss";

interface ILeftPanelProps {
  open?: boolean;
  toggleOpen?: () => void;
}

export const LeftPanel = observer(function LeftPanel({ open, toggleOpen }: ILeftPanelProps) {
  const { multiTrack } = useStores();
  // In multi-track mode the Saved Tracks section flexes to fill the panel (down to the footer), so
  // the setup list takes only its natural height; in single-run mode the setup list fills instead.
  const panelClasses = clsx(css.leftPanel, { [css.open]: open, [css.multiTrackMode]: multiTrack.enabled });
  return (
    <div className={css.leftPanelContainer}>
      <div className={panelClasses} data-test="left-panel">
        <List
          className={css.panelList}
          aria-labelledby="left-panel-title"
          subheader={
            <ListSubheader component="div" className={css.leftPanelHeader}>
              <div id="left-panel-title" className={css.leftPanelTitle}>
                <SetupIcon className={css.titleIcon} />
                Storm Setup and Runs
              </div>
              <button
                type="button"
                aria-label="Close"
                className={css.leftPanelCloseButton}
                data-test="left-panel-close-button"
                onClick={toggleOpen}
              >
                ×
              </button>
            </ListSubheader>
          }
        >
          <TrackModeToggle />
          <StormLocationSection />
          <StormCategorySection />
          <SeasonSection />
          <SeaSurfaceTemperaturesSection />
          <PressureSystemsSection />
          <SingleTrackCard />
        </List>
        <SavedTracksSection />
        <RunOptions />
      </div>
    </div>
  );
});

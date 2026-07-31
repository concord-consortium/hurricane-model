import CloseIcon from "@mui/icons-material/Close";
import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import clsx from "clsx";
import React from "react";

import { PressureSystemsSection } from "./pressure-systems-section";
import { RunOptions } from "./run-options";
import { SavedTracksSection } from "./saved-tracks-section";
import { SeasonSection } from "./season-section";
import { SeaSurfaceTemperaturesSection } from "./sea-surface-temperatures-section";
import { StormCategorySection } from "./storm-category-section";
import { StormLocationSection } from "./storm-location-section";
import { TrackModeToggle } from "./track-mode-toggle";

import css from "./left-panel.scss";

interface ILeftPanelProps {
  open?: boolean;
  toggleOpen?: () => void;
}

export function LeftPanel({ open, toggleOpen }: ILeftPanelProps) {
  const panelClasses = clsx(css.leftPanel, { [css.open]: open });
  return (
    <div className={css.leftPanelContainer}>
      <div className={panelClasses} data-test="left-panel">
        <List
          aria-labelledby="left-panel-title"
          subheader={
            <ListSubheader component="div" className={css.leftPanelHeader}>
              <div id="left-panel-title" className={css.leftPanelTitle}>
                Storm Setup
              </div>
              <button
                type="button"
                aria-label="Close"
                className={css.leftPanelCloseButton}
                data-test="left-panel-close-button"
                onClick={toggleOpen}
              >
                <CloseIcon />
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
          <SavedTracksSection />
          <RunOptions />
        </List>
      </div>
    </div>
  );
}

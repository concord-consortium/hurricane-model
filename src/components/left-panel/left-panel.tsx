import CloseIcon from "@mui/icons-material/Close";
import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import clsx from "clsx";
import React from "react";

import { SetupSection } from "./setup-section";

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
          <SetupSection
            setupMode="stormLocation"
            title="Storm Start Location"
          >
            Storm Start Location
          </SetupSection>
          <SetupSection
            setupMode="stormCategory"
            title="Storm Category"
          >
            Storm Category
          </SetupSection>
          <SetupSection
            setupMode="season"
            title="Starting Season"
          >
            Season
          </SetupSection>
          <SetupSection
            setupMode="seaSurfaceTemperatures"
            title="Sea Surface Temp Anomalies"
          >
            Sea Surface Temperature Anomalies
          </SetupSection>
          <SetupSection
            setupMode="pressureSystems"
            title="Pressure Systems"
          >
            Pressure Systems
          </SetupSection>
        </List>
      </div>
    </div>
  );
}

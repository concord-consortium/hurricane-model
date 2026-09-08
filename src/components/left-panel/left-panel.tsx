import CloseIcon from "@mui/icons-material/Close";
import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import clsx from "clsx";
import { observer } from "mobx-react";
import React, { useEffect } from "react";

import { Tab } from "../tab";
import { PressureSystemsSection } from "./pressure-systems-section";
import { RunsSection } from "./runs-section";
import { SeasonSection } from "./season-section";
import { SeaSurfaceTemperaturesSection } from "./sea-surface-temperatures-section";
import { StormCategorySection } from "./storm-category-section";
import { StormLocationSection } from "./storm-location-section";

import tabCss from "../tab.scss";
import css from "./left-panel.scss";
import { useStores } from "../../stores-context";

interface ILeftPanelProps {
  open?: boolean;
  toggleOpen?: () => void;
}

export const LeftPanel = observer(function LeftPanel({ open, toggleOpen }: ILeftPanelProps) {
  const { simulation, ui } = useStores();

  // Clear the setup mode selection when the simulation has started, or we switch to a previously completed run.
  useEffect(() => {
    if (simulation.simulationStarted) {
      ui.setSetupMode(undefined);
    }
  }, [simulation.simulationStarted, ui]);

  const panelClasses = clsx(css.leftPanel, { [css.open]: open });
  return (
    <div className={css.leftPanelContainer}>
      <Tab
        active={open}
        className={tabCss.setup}
        dataTest="tab-setup"
        onClick={toggleOpen}
        side="left"
        text="Storm Setup"
      />
      <div className={panelClasses} data-test="left-panel">
        <div className={css.panelBack}>
          <div className={css.panelContent}>
            <List
              aria-labelledby="left-panel-title"
              className={css.setupSectionList}
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
              <StormLocationSection />
              <StormCategorySection />
              <SeasonSection />
              <SeaSurfaceTemperaturesSection />
              <PressureSystemsSection />
            </List>
            <RunsSection />
          </div>
        </div>
      </div>
    </div>
  );
});

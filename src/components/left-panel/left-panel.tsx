import List from "@mui/material/List";
import ListSubheader from "@mui/material/ListSubheader";
import clsx from "clsx";
import { observer } from "mobx-react";
import React from "react";

import { PressureSystemsSection } from "./pressure-systems-section";
import { SavedTracksSection } from "./saved-tracks-section";
import { SeasonSection } from "./season-section";
import { SeaSurfaceTemperaturesSection } from "./sea-surface-temperatures-section";
import { StormCategorySection } from "./storm-category-section";
import { StormLocationSection } from "./storm-location-section";

import css from "./left-panel.scss";

interface ILeftPanelProps {
  open?: boolean;
  toggleOpen?: () => void;
}

export const LeftPanel = observer(function LeftPanel({ open, toggleOpen }: ILeftPanelProps) {
  // The Saved Tracks section flexes to fill the panel (down to the footer), so the setup list takes
  // only its natural height.
  const panelClasses = clsx(css.leftPanel, css.multiTrackMode, { [css.open]: open });
  return (
    <div className={css.leftPanelContainer}>
      <div className={panelClasses} data-test="left-panel">
        {/* Orange backing + narrower content = the color band (mirror of the right panel). */}
        <div className={css.panelBack}>
          <div className={css.panelContent}>
            <List
              className={css.panelList}
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
                    ×
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
            <SavedTracksSection />
          </div>
        </div>
      </div>
      {/* Fixed handle at the screen edge (a sibling of the panel, not a child, so it does NOT ride
          out with the panel). The panel has a higher z-index and slides OVER it: shown when the panel
          is closed, covered/hidden beneath the panel when open. */}
      <button
        type="button"
        className={clsx(css.stormSetupTab, { [css.tucked]: open })}
        onClick={toggleOpen}
        data-test="storm-setup-tab"
        aria-label={open ? "Close Storm Setup panel" : "Open Storm Setup panel"}
      >
        <span className={css.stormSetupTabInner} />
        <span className={css.stormSetupTabLabel}>Storm Setup</span>
      </button>
    </div>
  );
});

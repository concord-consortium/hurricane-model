import CloseIcon from "@mui/icons-material/Close";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListSubheader from "@mui/material/ListSubheader";
import clsx from "clsx";
import React from "react";

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
                onClick={toggleOpen}
              >
                <CloseIcon />
              </button>
            </ListSubheader>
          }
        >
          <ListItem>
            Storm Start Location and more text to make things really wide
          </ListItem>
        </List>
      </div>
    </div>
  );
}

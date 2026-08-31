import Collapse from "@mui/material/Collapse";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { clsx } from "clsx";
import { observer } from "mobx-react";
import React, { FunctionComponent, ReactNode } from "react";

import { SetupMode } from "../../models/ui";
import { useStores } from "../../stores-context";

import DropdownArrow from "../../assets/left-panel/dropdown-arrow.svg";

import css from "./setup-section.scss";

interface ISetupSectionProps {
  children?: ReactNode | ReactNode[];
  dataTest?: string;
  hint?: string;
  Icon?: FunctionComponent;
  iconClassName?: string;
  note?: string;
  setupMode: SetupMode;
  tip?: string;
  title: string;
}

export const SetupSection = observer(function SetupSection({
  children, dataTest, hint, Icon, iconClassName, note, setupMode, tip, title
}: ISetupSectionProps) {
  const stores = useStores();
  const open = stores.ui.setupMode === setupMode;
  const dt = dataTest || title;

  const handleClick = () => {
    if (open) {
      stores.ui.setSetupMode(undefined);
    } else {
      stores.ui.setSetupMode(setupMode);
    }
  };

  const headerClasses = clsx(css.sectionHeader, { [css.openSectionHeader]: open })
  return (
    <>
      <ListItemButton
        className={headerClasses}
        data-test={`${dt}-button`}
        disabled={stores.simulation.simulationStarted}
        disableRipple={true}
        onClick={handleClick}
      >
        {Icon && <ListItemIcon className={iconClassName}><Icon /></ListItemIcon>}
        <ListItemText
          primary={title}
          slotProps={{ primary: { className: css.sectionTitle } }}
        />
        <div className={clsx(css.dropdownArrow, { [css.open]: open })}>
          <DropdownArrow />
        </div>
      </ListItemButton>
      <Collapse data-test={`${dt}-content`} in={open} unmountOnExit>
        <div className={css.section} data-test={`${dt}-section`}>
          {hint && <div className={css.hint}>{hint}</div>}
          {children}
          {(tip || note) && <div className={css.tip}>
            <span className={css.bold}>{tip ? "Tip" : "Note"}:</span> {tip ?? note}
          </div>}
        </div>
      </Collapse>
    </>
  );
});

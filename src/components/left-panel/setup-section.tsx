import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Collapse from "@mui/material/Collapse";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { observer } from "mobx-react";
import React, { FunctionComponent, ReactNode } from "react";

import { SetupMode } from "../../models/ui";
import { useStores } from "../../stores-context";

import css from "./setup-section.scss";

interface ISetupSectionProps {
  children?: ReactNode | ReactNode[];
  dataTest?: string;
  hint?: string;
  Icon?: FunctionComponent;
  setupMode: SetupMode;
  title: string;
}

export const SetupSection = observer(function SetupSection({
  children, dataTest, hint, Icon, setupMode, title
}: ISetupSectionProps) {
  const stores = useStores();
  const open = stores?.ui.setupMode === setupMode;
  const dt = dataTest || title;

  const handleClick = () => {
    if (open) {
      stores?.ui.setSetupMode(undefined);
    } else {
      stores?.ui.setSetupMode(setupMode);
    }
  };

  return (
    <>
      <ListItemButton data-test={`${dt}-button`} onClick={handleClick}>
        {Icon && <ListItemIcon><Icon /></ListItemIcon>}
        <ListItemText primary={title} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse data-test={`${dt}-content`} in={open} unmountOnExit>
        <div className={css.section} data-test={`${dt}-section`}>
          {hint && <div className={css.hint}>{hint}</div>}
          {children}
        </div>
      </Collapse>
    </>
  );
});

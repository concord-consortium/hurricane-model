import { observer } from "mobx-react-lite";
import React, { useCallback, ReactNode } from "react";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Collapse from "@mui/material/Collapse";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

import { SetupMode } from "../../models/ui";
import { useStores } from "../../stores-context";

interface ISetupSectionProps {
  children?: ReactNode | ReactNode[];
  setupMode: SetupMode;
  title: string;
}

export const SetupSection = observer(function SetupSection({
  children, setupMode, title
}: ISetupSectionProps) {
  const stores = useStores();
  const open = stores?.ui.setupMode === setupMode;

  const handleClick = useCallback(() => {
    if (open) {
      stores?.ui.setSetupMode(undefined);
    } else {
      stores?.ui.setSetupMode(setupMode);
    }
  }, [open, setupMode, stores?.ui]);

  return (
    <>
      <ListItemButton onClick={handleClick}>
        <ListItemText primary={title} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} unmountOnExit>
        {children}
      </Collapse>
    </>
  );
});

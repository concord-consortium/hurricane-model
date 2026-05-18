import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Collapse from "@mui/material/Collapse";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { observer } from "mobx-react-lite";
import React, { ReactNode } from "react";

import { SetupMode } from "../../models/ui";
import { useStores } from "../../stores-context";

interface ISetupSectionProps {
  children?: ReactNode | ReactNode[];
  dataTest?: string;
  setupMode: SetupMode;
  title: string;
}

export const SetupSection = observer(function SetupSection({
  children, dataTest, setupMode, title
}: ISetupSectionProps) {
  const stores = useStores();
  const open = stores?.ui.setupMode === setupMode;

  const handleClick = () => {
    if (open) {
      stores?.ui.setSetupMode(undefined);
    } else {
      stores?.ui.setSetupMode(setupMode);
    }
  };

  return (
    <>
      <ListItemButton data-test={`${dataTest || title}-button`} onClick={handleClick}>
        <ListItemText primary={title} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse data-test={`${dataTest || title}-content`} in={open} unmountOnExit>
        {children}
      </Collapse>
    </>
  );
});

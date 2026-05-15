import React from "react";
import Drawer from '@mui/material/Drawer';

interface ILeftPanelProps {
  open?: boolean;
}

export function LeftPanel({ open }: ILeftPanelProps) {
  return (
    <Drawer
      anchor="left"
      open={open}
      variant="persistent"
    >
      Storm Setup
    </Drawer>
  );
}

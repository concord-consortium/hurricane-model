import { observer } from "mobx-react";
import React from "react";
import { changeWindArrows } from "../../utils/ui";
import Switch from "@mui/material/Switch";
import css from "./wind-arrows-toggle.scss";
import { useStores } from "../../stores-context";

export const WindArrowsToggle = observer(function WindArrowsToggle() {
  const { ui } = useStores();
  const checked = ui.windArrows;

  const handleChange = (e: any, checked: boolean) => {
    changeWindArrows(ui, checked);
  };

  return (
    <div className={css.windArrowsToggle}>
      <div className={css.label}>Wind Direction and Speed</div>
      <div className={css.toggleContainer}>
        <Switch disableRipple={true} color="secondary" checked={checked} onChange={handleChange} />
      </div>
    </div>
  );
});

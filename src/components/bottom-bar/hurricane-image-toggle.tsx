import { observer } from "mobx-react";
import React from "react";
import Switch from "@mui/material/Switch";
import css from "./hurricane-image-toggle.scss";
import { useStores } from "../../stores-context";
import { changeHurricaneImage } from "../../utils/ui";

export const HurricaneImageToggle = observer(function HurricaneImageToggle() {
  const { ui } = useStores();
  const checked = ui.hurricaneImage;

  const handleChange = (e: any, checked: boolean) => {
    changeHurricaneImage(ui, checked);
  };

  return (
    <div className={css.hurricaneImageToggle}>
      <div className={css.label}>Hurricane Image</div>
      <div className={css.toggleContainer}>
        <Switch disableRipple={true} color="secondary" checked={checked} onChange={handleChange} />
      </div>
    </div>
  );
});

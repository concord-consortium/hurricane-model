import Switch from "@mui/material/Switch";
import { clsx } from "clsx";
import * as React from "react";

import css from "./labeled-switch.scss";

interface IProps {
  title: string;
  title2?: string; // Additional title on a second line.
  offLabel: string;
  onLabel: string;
  checked: boolean;
  dataTest: string;
  onChange: (checked: boolean) => void;
}

export function LabeledSwitch({ title, title2, offLabel, onLabel, checked, dataTest, onChange }: IProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, value: boolean) => onChange(value);
  return (
    <div className={css.labeledSwitch} data-test={dataTest}>
      <div className={css.title}>{title}{title2 && <><br/>{title2}</>}</div>
      <div className={css.switchRow}>
        <span className={clsx(css.sideLabel, { [css.active]: !checked })}>{offLabel}</span>
        <Switch
          disableRipple={true}
          color="secondary"
          checked={checked}
          onChange={handleChange}
          slotProps={{ input: { "aria-label": `${title}${title2 ? ` ${title2}` : ""}` } }}
        />
        <span className={clsx(css.sideLabel, { [css.active]: checked })}>{onLabel}</span>
      </div>
    </div>
  );
}

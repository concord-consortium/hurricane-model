import Switch from "@mui/material/Switch";
import { clsx } from "clsx";
import * as React from "react";

import css from "./labeled-switch.scss";

interface IProps {
  title: string;
  offLabel: string;
  onLabel: string;
  checked: boolean;
  dataTest: string;
  onChange: (checked: boolean) => void;
}

export function LabeledSwitch({ title, offLabel, onLabel, checked, dataTest, onChange }: IProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, value: boolean) => onChange(value);
  return (
    <div className={css.labeledSwitch} data-test={dataTest}>
      <div className={css.title}>{title}</div>
      <div className={css.switchRow}>
        <span className={clsx(css.sideLabel, { [css.active]: !checked })}>{offLabel}</span>
        <Switch
          disableRipple={true}
          color="secondary"
          checked={checked}
          onChange={handleChange}
          slotProps={{ input: { "aria-label": title } }}
        />
        <span className={clsx(css.sideLabel, { [css.active]: checked })}>{onLabel}</span>
      </div>
    </div>
  );
}

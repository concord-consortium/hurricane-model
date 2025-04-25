import * as React from "react";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";

import * as css from "./select-button.scss";

interface ISelectButtonProps {
  disabled?: boolean;
  label: string;
  menuItems: Array<{ value: string; label: string; testId: string }>;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export const SelectButton: React.FC<ISelectButtonProps> = (props) => {
  const { disabled = false, label, menuItems, value, onChange, onMenuOpen, onMenuClose } = props;
  const testIdSlug = label.toLowerCase().replace(/\s+/g, "-");
  const containerTestId = `${testIdSlug}-container`;
  const selectTestId = `${testIdSlug}-button`;

  return (
    <div className={`${css.selectButton} ${disabled ? css.disabled : ""}`} data-test={containerTestId}>
      <div className={css.label}>{label}</div>
      <div className={css.selectContainer}>
        <Select
          value={value}
          onChange={onChange}
          className={css.select}
          data-test={selectTestId}
          disabled={disabled}
          disableUnderline={true}
          renderValue={(selectedValue: string) => (
            <span style={{ paddingLeft: 8 }}>
              {menuItems.find(item => item.value === selectedValue)?.label}
            </span>
          )}
          onOpen={onMenuOpen}
          onClose={onMenuClose}
        >
          {menuItems.map(item => (
            <MenuItem key={item.value} className={css.menuItem} value={item.value}>
              <div data-test={item.testId}>{item.label}</div>
            </MenuItem>
          ))}
        </Select>
      </div>
    </div>
  );
};

// Original spec had a check mark; updated spec does not.
// We leave the implementation in place in case the check mark comes back.
const OptionalCheck: React.FC<{ show: boolean }> = ({ show }) => {
  return null;
  // const checkMark = "\u2713"; // ✓
  // return (
  //   <div className={show ? "checked" : ""}>
  //     {show ? checkMark : ""}
  //   </div>
  // );
};

import * as React from "react";
import css from "./loading-indicator.scss";

interface IProps {
  message?: string;
}

export const LoadingIndicator: React.FC<IProps> = ({ message = "Loading..." }) => {
  return (
    <div
      className={css.loadingIndicator}
      role="status"
      aria-live="polite"
    >
      <div className={css.spinner} aria-hidden="true" />
      <p className={css.message}>{message}</p>
    </div>
  );
};

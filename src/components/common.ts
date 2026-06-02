import commonStyles from "./common.scss";

// Keep in sync with $leftPanelWidth and $leftPanelTransitionSeconds in common.scss
// (exported via :export, parsed here to strip the px/s units).
export const LEFT_PANEL_WIDTH_PX = parseInt(commonStyles.leftPanelWidth, 10);
export const LEFT_PANEL_TRANSITION_SECONDS = parseFloat(commonStyles.leftPanelTransitionSeconds);

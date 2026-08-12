import commonStyles from "./common.scss";

// Keep in sync with $leftPanelWidth and $leftPanelTransitionSeconds in common.scss
// (exported via :export, parsed here to strip the px/s units).
export const coldColor = commonStyles.coldColor;
export const warmColor = commonStyles.warmColor;
export const fontColor = commonStyles.fontColor;
export const LEFT_PANEL_WIDTH_PX = parseInt(commonStyles.leftPanelWidth, 10);
export const LEFT_PANEL_BAND_WIDTH_PX = parseInt(commonStyles.leftPanelBandWidth, 10);
// Full footprint (content + orange band) used to offset the map region so the panel+band never covers it.
export const LEFT_PANEL_FULL_WIDTH_PX = parseInt(commonStyles.leftPanelFullWidth, 10);
export const LEFT_PANEL_TRANSITION_SECONDS = parseFloat(commonStyles.leftPanelTransitionSeconds);

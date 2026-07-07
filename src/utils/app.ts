import config from "../config";

export function getAppName() {
  return config.mode === "storm" ? "Storm Explorer" : "Hurricane Explorer";
}

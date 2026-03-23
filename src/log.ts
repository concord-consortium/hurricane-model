import { log as laraLog } from "@concord-consortium/lara-interactive-api";
import { createLogWrapper } from "@concord-consortium/log-monitor";
import config from "./config";

export const log = config.logMonitor
  ? createLogWrapper(laraLog)
  : laraLog;

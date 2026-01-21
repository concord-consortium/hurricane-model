import config from "../config";
import { IHurricaneAuthoredState } from "../types/interactive-state";
import { parseAuthoredUrlParams } from "./parse-authored-params";

/**
 * Applies authored state to the global config object.
 * This modifies the config in place, similar to how URL parameters work.
 */
export function applyAuthoredState(authoredState: IHurricaneAuthoredState | null): void {
  if (!authoredState?.urlParams) {
    return;
  }

  const { params } = parseAuthoredUrlParams(authoredState.urlParams);

  // Apply each param to config (similar to how URL params are applied in config.ts)
  for (const [key, value] of Object.entries(params)) {
    applyConfigParam(key, value);
  }
}

function applyConfigParam(key: string, value: string): void {
  // Handle boolean values
  if (value === "true") {
    (config as any)[key] = true;
    return;
  }
  if (value === "false") {
    (config as any)[key] = false;
    return;
  }

  // Handle JSON values (arrays, objects)
  if (isJSON(value)) {
    (config as any)[key] = JSON.parse(value);
    return;
  }

  // Handle array format: [value1,value2,value3]
  if (isArray(value)) {
    if (value === "[]") {
      (config as any)[key] = [];
    } else {
      (config as any)[key] = value.substring(1, value.length - 1).split(",");
    }
    return;
  }

  // Handle numeric values
  if (!isNaN(parseFloat(value))) {
    (config as any)[key] = parseFloat(value);
    return;
  }

  // Default: treat as string
  (config as any)[key] = value;
}

function isArray(value: string): boolean {
  return typeof value === "string" && /^\[.*\]$/.test(value);
}

function isJSON(value: string): boolean {
  if (typeof value !== "string") {
    return false;
  }
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
}

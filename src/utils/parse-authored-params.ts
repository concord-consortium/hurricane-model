interface IParseResult {
  valid: boolean;
  params: Record<string, string>;
  errors: string[];
}

interface IParameterDoc {
  name: string;
  type: "string" | "boolean" | "number" | "array";
  validValues?: string;
  description: string;
}

/**
 * Comprehensive documentation of all available configuration parameters.
 * This is used both for validation and for the authoring interface documentation.
 */
export const KNOWN_PARAMETERS: IParameterDoc[] = [
  // Core simulation settings
  {
    name: "season",
    type: "string",
    validValues: "fall, winter, spring, summer",
    description: "Sets wind data patterns"
  },
  {
    name: "startLocation",
    type: "string",
    validValues: "atlantic, gulf",
    description: "Hurricane starting position"
  },
  {
    name: "mode",
    type: "string",
    validValues: "hurricane, storm",
    description: "App Mode (hurricane or storm)"
  },

  // Map settings
  {
    name: "map",
    type: "string",
    validValues: "satellite, relief, street, population",
    description: "Base map type"
  },
  {
    name: "overlay",
    type: "string",
    validValues: "sst, precipitation, stormSurge",
    description: "Active map overlay"
  },
  {
    name: "availableOverlays",
    type: "array",
    validValues: "[sst,precipitation,stormSurge]",
    description: "Overlays available to user"
  },
  {
    name: "enablePopulationMap",
    type: "boolean",
    validValues: "true, false",
    description: "Enable population base map option"
  },
  {
    name: "navigation",
    type: "boolean",
    validValues: "true, false",
    description: "Allow map pan/zoom"
  },

  // Hurricane display
  {
    name: "windArrows",
    type: "boolean",
    validValues: "true, false",
    description: "Show wind direction arrows"
  },
  {
    name: "hurricaneImage",
    type: "boolean",
    validValues: "true, false",
    description: "Show hurricane satellite image"
  },
  {
    name: "categoryChangeMarkers",
    type: "boolean",
    validValues: "true, false",
    description: "Show category change markers on track"
  },
  {
    name: "markLandfalls",
    type: "boolean",
    validValues: "true, false",
    description: "Show clickable landfall markers"
  },

  // Interaction controls
  {
    name: "pressureSystemsLocked",
    type: "boolean",
    validValues: "true, false",
    description: "Prevent moving pressure systems"
  },
  {
    name: "lockSimulationWhileRunning",
    type: "boolean",
    validValues: "true, false",
    description: "Lock controls during simulation"
  },

  // UI visibility
  {
    name: "topBarVisible",
    type: "boolean",
    validValues: "true, false",
    description: "Show top bar with reload, share, and about buttons"
  },
  {
    name: "startLocationButton",
    type: "boolean",
    validValues: "true, false",
    description: "Show start location button"
  },
  {
    name: "seasonButton",
    type: "boolean",
    validValues: "true, false",
    description: "Show season button"
  },
  {
    name: "windArrowsToggle",
    type: "boolean",
    validValues: "true, false",
    description: "Show wind arrows toggle"
  },
  {
    name: "hurricaneImageToggle",
    type: "boolean",
    validValues: "true, false",
    description: "Show hurricane image toggle"
  },

  // Advanced settings (less commonly used)
  {
    name: "timestep",
    type: "number",
    validValues: "positive number",
    description: "Simulation time step"
  },
  {
    name: "deterministic",
    type: "boolean",
    validValues: "true, false",
    description: "Make simulation results reproducible"
  },
  {
    name: "seaSurfaceTempOpacity",
    type: "number",
    validValues: "0-1",
    description: "SST overlay opacity"
  },
  {
    name: "defaultSSTScale",
    type: "string",
    validValues: "default, rainbowCC",
    description: "Default SST color scale"
  },
  {
    name: "accessibleSSTScale",
    type: "string",
    validValues: "purple3, purpleCC",
    description: "Accessible SST color scale"
  },
];

// Build a map for quick lookup
const KNOWN_PARAM_MAP = new Map(KNOWN_PARAMETERS.map(p => [p.name, p]));

// Minimum prefix length for fuzzy matching when suggesting similar parameters.
// Using 4 characters balances between catching typos (e.g., "seas" matches "season")
// and avoiding too many false positives from very short prefixes.
const MIN_SIMILARITY_PREFIX_LENGTH = 4;

// Helper to find similar parameter names for suggestions
function findSimilarParams(unknown: string): string[] {
  const lower = unknown.toLowerCase();
  return KNOWN_PARAMETERS
    .filter(p => {
      const pLower = p.name.toLowerCase();
      return pLower.includes(lower) || lower.includes(pLower.slice(0, MIN_SIMILARITY_PREFIX_LENGTH));
    })
    .map(p => p.name)
    .slice(0, 3);
}

export function parseAuthoredUrlParams(urlParams: string | undefined): IParseResult {
  if (!urlParams?.trim()) {
    return { valid: true, params: {}, errors: [] };
  }

  const params: Record<string, string> = {};
  const errors: string[] = [];

  // Split by newlines first, then process each line
  const lines = urlParams.split(/\n/).map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    // Each line can be a query string (key=value&key2=value2) or a single key=value
    const pairs = line.split("&").map(p => p.trim()).filter(Boolean);

    for (const pair of pairs) {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) {
        // Treat parameters without an = as true.
        // This stays consistent with getURLParam in config.ts.
        params[pair] = "true";
        continue;
      }

      const key = pair.substring(0, eqIndex).trim();
      const value = pair.substring(eqIndex + 1).trim();

      if (!key) {
        errors.push(`Empty key in: "${pair}"`);
        continue;
      }

      params[key] = value;
    }
  }

  return {
    valid: errors.length === 0,
    params,
    errors
  };
}

export function validateUrlParams(urlParams: string): IParseResult {
  const result = parseAuthoredUrlParams(urlParams);

  // Validate each parameter against known parameters
  for (const [key, value] of Object.entries(result.params)) {
    const paramDoc = KNOWN_PARAM_MAP.get(key);

    if (!paramDoc) {
      // Unknown parameter - suggest similar ones
      const similar = findSimilarParams(key);
      let errorMsg = `Unknown parameter: "${key}"`;
      if (similar.length > 0) {
        errorMsg += `. Did you mean: ${similar.join(", ")}?`;
      }
      result.errors.push(errorMsg);
      continue;
    }

    // Type-specific validation
    if (paramDoc.type === "boolean" && !["true", "false"].includes(value.toLowerCase())) {
      result.errors.push(`Parameter "${key}" expects true or false, got: "${value}"`);
    }

    if (paramDoc.type === "number" && isNaN(parseFloat(value))) {
      result.errors.push(`Parameter "${key}" expects a number, got: "${value}"`);
    }

    // Validate against known valid values (for string enums)
    if (paramDoc.type === "string" && paramDoc.validValues) {
      const validOptions = paramDoc.validValues.split(",").map(v => v.trim());
      // Only validate if this looks like an enumeration of actual values, not a description.
      // Enumerations have multiple single-word options (e.g., "fall, winter, spring, summer").
      // Descriptions may have spaces within options (e.g., "positive number") or be a single option.
      const looksLikeEnumeration = validOptions.length > 1 &&
        validOptions.every(opt => !opt.includes(" "));
      if (looksLikeEnumeration && !validOptions.includes(value)) {
        const msg = `Parameter "${key}" must be one of: ${paramDoc.validValues}. Got: "${value}"`;
        result.errors.push(msg);
      }
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}

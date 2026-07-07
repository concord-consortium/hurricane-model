export const appModes = ["hurricane", "storm"] as const;
export type AppMode = typeof appModes[number];

export interface IVector {
  u: number;
  v: number;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export const isCoordinates = (value: unknown): value is ICoordinates => {
  return typeof value === "object" && value !== null && "lat" in value && "lng" in value;
};

export interface IWindPoint extends IVector, ICoordinates {}

export interface IPrecipitationPoint extends Array<number> {
  [0]: number; // lat
  [1]: number; // lon
  [2]: number; // intensity
  [3]: number; // size
}

export interface ITrackPoint {
  position: ICoordinates;
  category: number;
}

export interface ILandfall {
  position: ICoordinates;
  category: number;
}

export type Season = "winter" | "spring" | "summer" | "fall" | "earlyFall" | "lateFall";
export const seasonLabels: Record<Season, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  earlyFall: "Early Fall",
  lateFall: "Late Fall"
};
export const modeSeasons: Record<string, Season[]> = {
  "hurricane": ["winter", "spring", "summer", "fall"],
  "storm": ["summer", "earlyFall", "lateFall"]
};

// The four ocean regions whose sea surface temperature can be adjusted.
export const namedRegions = ["gulf", "caribbean", "centralAtlantic", "coastalAfrica"] as const;
export type NamedRegion = typeof namedRegions[number];

export type StartLocationNames = "atlantic" | "gulf";
export type StartLocation = StartLocationNames | ICoordinates;

export const startLocationNameLabels: Record<StartLocationNames, string> = {
  atlantic: "Atlantic",
  gulf: "Gulf"
};

export const isStartLocationName = (value: unknown): value is StartLocationNames => {
  return value === "atlantic" || value === "gulf";
};

export type ISSTImages = Record<Season, string>;
